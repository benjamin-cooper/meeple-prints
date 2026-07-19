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

export async function scanGame(game: { id: number; name: string }) {
  const outcomes = await searchAllProviders(game.name, getProviderCredentials());

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
// in parallel) plus the 400ms courtesy delay, so a full batch of 10 could
// exceed 60s and get killed mid-run. Stop starting new games once the
// remaining time no longer comfortably fits a worst-case game so the
// function always returns cleanly; games ordered by lastScannedAt asc means
// anything skipped this run is simply first in line next time.
const BATCH_TIME_BUDGET_MS = 45_000;

export async function scanNextBatch(limit: number): Promise<{ scanned: number; newPrints: number }> {
  // SQLite orders NULL as smallest, so never-scanned games naturally sort first.
  const games = await prisma.game.findMany({
    where: { inCollection: true },
    orderBy: [{ lastScannedAt: "asc" }, { name: "asc" }],
    take: limit,
  });

  const start = Date.now();
  let scanned = 0;
  let newPrints = 0;
  for (const game of games) {
    if (Date.now() - start > BATCH_TIME_BUDGET_MS) break;
    newPrints += await scanOne(game);
    scanned++;
    await new Promise((r) => setTimeout(r, 400));
  }

  return { scanned, newPrints };
}

/** Sweeps every in-collection game once, regardless of batch-size caps. For the one-off full-scan script. */
export async function scanAll(
  onProgress?: (done: number, total: number, gameName: string) => void
): Promise<{ scanned: number; newPrints: number }> {
  const games = await prisma.game.findMany({ where: { inCollection: true }, orderBy: { name: "asc" } });

  let newPrints = 0;
  for (let i = 0; i < games.length; i++) {
    onProgress?.(i, games.length, games[i].name);
    newPrints += await scanOne(games[i]);
    await new Promise((r) => setTimeout(r, 400));
  }

  return { scanned: games.length, newPrints };
}
