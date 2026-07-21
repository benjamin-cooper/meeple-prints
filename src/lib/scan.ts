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
import { MISC_GAME_BGG_ID } from "@/lib/constants";

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
  // same Cults3D listing being refreshed) -- findDuplicateIndices already
  // skips same-domain pairs, so a row can never be compared against its own
  // refresh; it can only ever be compared against a genuinely different
  // domain's copy, which is exactly what needs resolving.
  const existing = await prisma.discoveredPrint.findMany({
    where: { gameId, hidden: false },
    select: { id: true, title: true, domain: true, ratingCount: true, likesCount: true },
  });
  if (existing.length === 0) return outcomes;

  const combined = [...existing, ...newFlat];
  const toDrop = findDuplicateIndices(combined);
  if (toDrop.size === 0) return outcomes;

  const existingIdsToHide = [...toDrop].filter((i) => i < existing.length).map((i) => existing[i].id);
  if (existingIdsToHide.length) {
    await prisma.discoveredPrint.updateMany({ where: { id: { in: existingIdsToHide } }, data: { hidden: true } });
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

export async function scanGame(
  game: { id: number; name: string },
  options?: { queries?: string[]; extraFilter?: (title: string) => boolean }
) {
  const queries = options?.queries ?? [game.name];
  const creds = getProviderCredentials();

  // Multiple queries (the miscellaneous game's curated term list) get
  // merged per-provider and deduped by URL -- a listing can legitimately
  // match more than one query (e.g. "dice tower" and "d20 dice tray").
  // For the single-query case (every regular game) this is a no-op pass
  // over already-unique results, same behavior as before this supported
  // more than one query.
  const perQuery = await Promise.all(queries.map((q) => searchAllProviders(q, creds)));
  const merged = perQuery[0].map((base, providerIndex) => {
    const seen = new Set<string>();
    const results = perQuery
      .flatMap((outcomesForQuery) => outcomesForQuery[providerIndex].results)
      .filter((r) => {
        if (seen.has(r.url)) return false;
        seen.add(r.url);
        return true;
      })
      .filter((r) => !options?.extraFilter || options.extraFilter(r.title));
    const anySucceeded = perQuery.some((outcomesForQuery) => outcomesForQuery[providerIndex].error === null);
    return { ...base, results, error: anySucceeded ? null : base.error };
  });

  const outcomes = await dedupeAgainstExisting(game.id, merged);

  const urls = outcomes.flatMap((o) => o.results.map((r) => r.url));
  const existing = urls.length
    ? await prisma.product.findMany({ where: { url: { in: urls } }, select: { url: true } })
    : [];
  const savedUrls = new Set(existing.map((p) => p.url));

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
        return prisma.discoveredPrint.upsert({
          where: { gameId_url: { gameId: game.id, url: r.url } },
          update: data,
          create: { gameId: game.id, url: r.url, ...data },
        });
      })
    )
  );

  await prisma.game.update({ where: { id: game.id }, data: { lastScannedAt: new Date() } });

  return outcomes.map((o) => ({
    ...o,
    results: o.results.map((r) => ({ ...r, alreadySaved: savedUrls.has(r.url) })),
  }));
}

async function scanOne(game: { id: number; name: string }): Promise<number> {
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
export const DEFAULT_BATCH_TIME_BUDGET_MS = 45_000;

async function scanGamesWithBudget(
  games: { id: number; name: string }[],
  budgetMs: number
): Promise<{ scanned: number; newPrints: number }> {
  const start = Date.now();
  let scanned = 0;
  let newPrints = 0;
  for (const game of games) {
    if (Date.now() - start > budgetMs) break;
    newPrints += await scanOne(game);
    scanned++;
    await new Promise((r) => setTimeout(r, 400));
  }
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
