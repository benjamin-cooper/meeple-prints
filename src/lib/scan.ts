/**
 * Shared scan pipeline: search every configured provider for a game,
 * relevance-filter (handled inside searchAllProviders), cache the results
 * as DiscoveredPrint rows, and mark the game as scanned. Used by the manual
 * "Search all sites" button, the Catalog "Scan now" button, the daily cron
 * sweep, and the one-off full-scan script, so there's one place that
 * writes to the cache.
 */
import { prisma } from "@/lib/prisma";
import { searchAllProviders } from "@/lib/providers";
import { getProviderCredentials } from "@/lib/providers/env-credentials";
import { guessTypeFromTitle } from "@/lib/providers/guess-type";
import { findDuplicateIndices } from "@/lib/providers/dedupe";
import {
  KNOWN_COLLISION_EXCLUSIONS,
  WARGAMING_SCALE_PATTERN,
  DOLLHOUSE_MINIATURE_PATTERN,
  failsEtsyPrintSignal,
} from "@/lib/providers/known-collisions";
import { MISC_GAME_BGG_ID } from "@/lib/constants";
import { MISC_SEARCH_TERMS } from "@/lib/providers/misc-terms";
import { judgeResults, shouldJudge } from "@/lib/providers/llm-judge";

/**
 * searchAllProviders already dedupes cross-domain matches within one call,
 * but that only ever compares results from the SAME scan against each
 * other -- it has no idea what's already cached from a previous one. A
 * provider that was down/unconfigured (Etsy pending approval, say) finding
 * the same listing weeks after another site already cached it would never
 * get compared, and both sit in Catalog side by side forever. This closes
 * that gap by pulling the game's existing not-yet-hidden cache into the
 * same dedupe pass as this scan's fresh results, then either hiding the
 * losing existing row or dropping the losing new one before it's ever
 * created.
 */
async function dedupeAgainstExisting<
  T extends { domain: string; results: { url: string; title: string; ratingCount: number | null; likesCount: number | null }[] }
>(gameId: number, outcomes: T[]): Promise<T[]> {
  const newFlat = outcomes.flatMap((o, oi) => o.results.map((r, ri) => ({ ...r, domain: o.domain, oi, ri })));
  if (newFlat.length === 0) return outcomes;

  // No need to exclude a new result's own already-cached row here (e.g. the
  // same Cults3D listing being refreshed, or an Etsy listing found again by
  // a later scan) -- findDuplicateIndices's same-URL guard (see its own
  // comment on the Etsy exception) already keeps a row from ever being
  // compared against its own refresh.
  const existing = await prisma.discoveredPrint.findMany({
    where: { gameId, hidden: false },
    select: { id: true, title: true, domain: true, url: true, ratingCount: true, likesCount: true },
  });
  if (existing.length === 0) return outcomes;

  const combined = [...existing, ...newFlat];
  const toDrop = findDuplicateIndices(combined);
  if (toDrop.size === 0) return outcomes;

  const existingIdsToHide = [...toDrop].filter((i) => i < existing.length).map((i) => existing[i].id);
  if (existingIdsToHide.length) {
    await prisma.discoveredPrint.updateMany({
      where: { id: { in: existingIdsToHide } },
      data: { hidden: true, hideReason: "duplicate" },
    });
  }

  const newDropKeys = new Set(
    [...toDrop]
      .filter((i) => i >= existing.length)
      .map((i) => combined[i] as (typeof newFlat)[number])
      .map((r) => `${r.oi}:${r.ri}`)
  );
  if (newDropKeys.size === 0) return outcomes;

  return outcomes.map((o, oi) => ({
    ...o,
    results: o.results.filter((_, ri) => !newDropKeys.has(`${oi}:${ri}`)),
  }));
}

/**
 * dedupeAgainstExisting only ever compares within one game's own rows, which
 * is right for the normal case (nothing else would search a specific game's
 * exact name). The Miscellaneous pseudo-game breaks that assumption: its
 * curated generic terms ("board game insert organizer") routinely surface
 * the exact same listing a specific game's own scan already found and
 * attached correctly -- confirmed live, the identical cults3d.com URL for a
 * Finspan organizer ended up cached under both "Finspan" and
 * "Miscellaneous". findDuplicateIndices wouldn't catch this either way: it
 * skips same-domain pairs, and this is the *same* domain, same URL, just a
 * different gameId -- a dimension that unique constraint doesn't cover
 * (@@unique([gameId, url])).
 *
 * Resolved by exact URL match (not fuzzy title similarity -- unnecessary
 * when it's the literal same listing) and always in favor of the specific
 * game over Miscellaneous, regardless of which one has more
 * ratings/likes: a Finspan accessory belongs on the Finspan page.
 */
async function resolveCrossGameDuplicates<T extends { domain: string; results: { url: string }[] }>(
  game: { id: number; bggId: number },
  outcomes: T[]
): Promise<T[]> {
  const urls = outcomes.flatMap((o) => o.results.map((r) => r.url));
  if (urls.length === 0) return outcomes;

  const isMisc = game.bggId === MISC_GAME_BGG_ID;

  if (isMisc) {
    const elsewhere = await prisma.discoveredPrint.findMany({
      where: { url: { in: urls }, hidden: false, gameId: { not: game.id } },
      select: { url: true },
    });
    if (elsewhere.length === 0) return outcomes;
    const claimedUrls = new Set(elsewhere.map((r) => r.url));
    return outcomes.map((o) => ({ ...o, results: o.results.filter((r) => !claimedUrls.has(r.url)) }));
  }

  const miscDupes = await prisma.discoveredPrint.findMany({
    where: { url: { in: urls }, hidden: false, gameId: { not: game.id }, game: { bggId: MISC_GAME_BGG_ID } },
    select: { id: true },
  });
  if (miscDupes.length) {
    await prisma.discoveredPrint.updateMany({ where: { id: { in: miscDupes.map((r) => r.id) } }, data: { hidden: true } });
  }
  return outcomes;
}

export async function scanGame(
  game: { id: number; name: string; bggId: number },
  options?: { queries?: { term: string; extraFilter: ((title: string) => boolean) | null }[] }
) {
  // A regular game's default (single, bare-name) query applies its known-
  // collision exclusion here if it has one (see known-collisions.ts), plus
  // the general cross-game WARGAMING_SCALE_PATTERN every game gets --
  // options.queries (the Miscellaneous game's curated term list) already
  // carries its own per-term filters and isn't touched by either.
  const collisionExclusion = KNOWN_COLLISION_EXCLUSIONS[game.name];
  const queries = options?.queries ?? [
    {
      term: game.name,
      extraFilter: (title: string) =>
        (!collisionExclusion || !collisionExclusion.test(title)) &&
        !WARGAMING_SCALE_PATTERN.test(title) &&
        !DOLLHOUSE_MINIATURE_PATTERN.test(title),
    },
  ];
  const creds = getProviderCredentials();

  // Multiple queries (the miscellaneous game's curated term list) get
  // merged per-provider and deduped by URL -- a listing can legitimately
  // match more than one query (e.g. "dice tower" and "d20 dice tray"). Each
  // query carries its own extraFilter rather than one shared across the
  // whole scan -- a generic term like "insert organizer" needs the
  // tabletop-signal safety net, but a precise brand term like "wyrmwood
  // table" would lose real results to it (see misc-terms.ts). For the
  // single-query case (every regular game) this is a no-op pass over
  // already-unique results, same behavior as before this supported more
  // than one query.
  const perQuery = await Promise.all(queries.map((q) => searchAllProviders(q.term, creds)));
  const merged = perQuery[0].map((base, providerIndex) => {
    const seen = new Set<string>();
    const results = perQuery
      .flatMap((outcomesForQuery, qi) => {
        const filter = queries[qi].extraFilter;
        return outcomesForQuery[providerIndex].results.filter(
          (r) => (!filter || filter(r.title)) && !failsEtsyPrintSignal(game.name, base.domain, r.title)
        );
      })
      .filter((r) => {
        if (seen.has(r.url)) return false;
        seen.add(r.url);
        return true;
      });
    const anySucceeded = perQuery.some((outcomesForQuery) => outcomesForQuery[providerIndex].error === null);
    return { ...base, results, error: anySucceeded ? null : base.error };
  });

  const deduped = await dedupeAgainstExisting(game.id, merged);
  const outcomes = await resolveCrossGameDuplicates(game, deduped);

  const urls = outcomes.flatMap((o) => o.results.map((r) => r.url));
  const existing = urls.length
    ? await prisma.product.findMany({ where: { url: { in: urls } }, select: { url: true } })
    : [];
  const savedUrls = new Set(existing.map((p) => p.url));

  // Second opinion on results this game has never stored (see llm-judge.ts).
  // Rejected ones are kept as hidden, labelled rows rather than dropped, so
  // they can be reviewed on the Hidden page and aren't re-judged next scan.
  const autoHidden = await judgeNewResults(game, outcomes, savedUrls);

  await Promise.all(
    outcomes.flatMap((o) =>
      o.results.map((r) => {
        const data = {
          title: r.title,
          thumbnailUrl: r.thumbnailUrl,
          domain: o.domain,
          siteName: o.siteName,
          type: guessTypeFromTitle(r.title),
          creator: r.creator,
          price: r.price,
          currency: r.currency,
          isFree: r.isFree,
          rating: r.rating,
          ratingCount: r.ratingCount,
          likesCount: r.likesCount,
        };
        const reason = autoHidden.get(r.url);
        return prisma.discoveredPrint.upsert({
          where: { gameId_url: { gameId: game.id, url: r.url } },
          update: data,
          create: {
            gameId: game.id, url: r.url, ...data,
            ...(reason ? { hidden: true, hideReason: `auto:${reason === "different-game" ? "wrong-game" : "off-topic"}` } : {}),
          },
        });
      })
    )
  );

  await prisma.game.update({ where: { id: game.id }, data: { lastScannedAt: new Date() } });

  return outcomes.map((o) => ({
    ...o,
    results: o.results.filter((r) => !autoHidden.has(r.url)).map((r) => ({ ...r, alreadySaved: savedUrls.has(r.url) })),
  }));
}

async function judgeNewResults(
  game: { id: number; name: string },
  outcomes: { domain: string; results: { url: string; title: string }[] }[],
  savedUrls: Set<string>
) {
  if (!shouldJudge(game.name) || !process.env.ANTHROPIC_API_KEY) return new Map<string, "different-game" | "off-topic">();
  const all = outcomes.flatMap((o) => o.results.filter((r) => !savedUrls.has(r.url)).map((r) => ({ url: r.url, title: r.title, domain: o.domain })));
  if (all.length === 0) return new Map<string, "different-game" | "off-topic">();
  const known = new Set(
    (await prisma.discoveredPrint.findMany({ where: { gameId: game.id, url: { in: all.map((c) => c.url) } }, select: { url: true } })).map((r) => r.url)
  );
  const fresh = all.filter((c) => !known.has(c.url));
  const rejected = await judgeResults(game.name, fresh);
  if (fresh.length > 0) console.log(`[judge] ${game.name}: rejected ${rejected.size} of ${fresh.length} new`);
  return rejected;
}

async function scanOne(game: { id: number; name: string; bggId: number }): Promise<number> {
  const before = await prisma.discoveredPrint.count({ where: { gameId: game.id } });
  await scanGame(game);
  const after = await prisma.discoveredPrint.count({ where: { gameId: game.id } });
  return Math.max(0, after - before);
}

// Cron and manual scan routes both cap the request at maxDuration = 60s. A
// single game can take up to ~10s (every provider's own fetch timeout, run
// in parallel) plus the 400ms courtesy delay, so an uncapped batch could
// exceed 60s and get killed mid-run. Stop starting new games once the given
// budget no longer comfortably fits a worst-case game so the caller always
// returns cleanly; games ordered by lastScannedAt asc (both callers below)
// means anything skipped this way is simply first in line next time.
export const DEFAULT_BATCH_TIME_BUDGET_MS = 40_000;

// Games are scanned a few at a time rather than strictly one after another:
// a single game spends most of its time waiting on provider network
// timeouts, so a purely sequential loop only got through a handful of games
// per 45s run -- a full pass over the collection took weeks. A small fixed
// pool keeps the extra load on each provider modest (the per-worker 400ms
// courtesy delay still applies) while cutting the full-pass time roughly
// by the pool size.
const SCAN_CONCURRENCY = 3;

async function scanGamesWithBudget(
  games: { id: number; name: string; bggId: number }[],
  budgetMs: number
): Promise<{ scanned: number; newPrints: number }> {
  const start = Date.now();
  let scanned = 0;
  let newPrints = 0;
  let next = 0;

  async function worker() {
    while (next < games.length && Date.now() - start <= budgetMs) {
      const game = games[next++];
      try {
        newPrints += await scanOne(game);
        scanned++;
      } catch (err) {
        // One game's failure shouldn't stop the rest of the batch; it just
        // keeps its old lastScannedAt and comes up first next time.
        console.error(`[scan] ${game.name} failed:`, err instanceof Error ? err.message : err);
      }
      await new Promise((r) => setTimeout(r, 400));
    }
  }

  await Promise.all(Array.from({ length: Math.min(SCAN_CONCURRENCY, games.length) }, worker));
  return { scanned, newPrints };
}

export async function scanNextBatch(
  limit: number,
  budgetMs: number = DEFAULT_BATCH_TIME_BUDGET_MS
): Promise<{ scanned: number; newPrints: number }> {
  // SQLite orders NULL as smallest, so never-scanned games naturally sort first.
  // Excludes the miscellaneous pseudo-game: it needs its own curated query
  // list (see misc-terms.ts), not a name-based search for the literal
  // string "Miscellaneous" -- kept manual-only for now via its own "Search
  // all sites" button, not part of the automatic daily rotation.
  const games = await prisma.game.findMany({
    where: { inCollection: true, bggId: { not: MISC_GAME_BGG_ID } },
    orderBy: [{ lastScannedAt: "asc" }, { name: "asc" }],
    take: limit,
  });

  return scanGamesWithBudget(games, budgetMs);
}

/**
 * The miscellaneous pseudo-game is excluded from scanNextBatch (it needs its
 * own curated query list, not a search for the word "Miscellaneous"), which
 * left its results refreshed only when someone pressed its button -- they
 * went 100+ days stale while ranking at the top of the Catalog by likes.
 * Scanned here instead whenever it's older than MISC_RESCAN_AFTER_DAYS. Its
 * 13 queries run at once, so callers should only invoke this with real
 * time to spare.
 */
const MISC_RESCAN_AFTER_DAYS = 14;

export async function scanMiscIfStale(): Promise<boolean> {
  const misc = await prisma.game.findUnique({ where: { bggId: MISC_GAME_BGG_ID } });
  if (!misc) return false;
  const staleBefore = Date.now() - MISC_RESCAN_AFTER_DAYS * 24 * 60 * 60 * 1000;
  if (misc.lastScannedAt && misc.lastScannedAt.getTime() > staleBefore) return false;
  await scanGame(misc, { queries: MISC_SEARCH_TERMS });
  return true;
}

/** Exported for the BGG collection sync's own "scan newly added games" step. */
export { scanGamesWithBudget };

/** Sweeps every in-collection game once, regardless of batch-size caps. For the one-off full-scan script. */
export async function scanAll(
  onProgress?: (done: number, total: number, gameName: string) => void
): Promise<{ scanned: number; newPrints: number }> {
  // Excludes the miscellaneous pseudo-game -- see scanNextBatch above.
  const games = await prisma.game.findMany({
    where: { inCollection: true, bggId: { not: MISC_GAME_BGG_ID } },
    orderBy: { name: "asc" },
  });

  let newPrints = 0;
  for (let i = 0; i < games.length; i++) {
    onProgress?.(i, games.length, games[i].name);
    newPrints += await scanOne(games[i]);
    await new Promise((r) => setTimeout(r, 400));
  }

  return { scanned: games.length, newPrints };
}
