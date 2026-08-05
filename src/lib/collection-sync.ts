/**
 * Shared BGG collection sync: pulls the connected account's owned base
 * games, upserts them into the local Game table, marks anything that fell
 * out of the collection as inCollection=false, and gives newly added games
 * an immediate scan instead of waiting on the daily cron's oldest-first
 * queue. Used by both the manual "Sync now" button and the daily cron, so
 * collection sync isn't purely a manual action anymore.
 *
 * A dropped game's *saved* products are deleted automatically as part of
 * the sync itself (a product linked to other games too just loses this
 * one link and survives, same split logic as games/[id] DELETE) -- this
 * used to wait for the person to manually opt in via the Connect page's
 * review dialog, but now happens unattended, including from the nightly
 * cron. The Game row itself is only ever soft-dropped (inCollection:
 * false), never deleted here, so it can still be fully removed by hand
 * later or come back cleanly if BGG shows it owned again on a future sync.
 */
import { getBggCollection } from "@/lib/bgg";
import { scanGamesWithBudget } from "@/lib/scan";
import { prisma } from "@/lib/prisma";
import { MISC_GAME_BGG_ID } from "@/lib/constants";

export interface CollectionSyncResult {
  imported: number;
  removedFromCollection: number;
  newGames: number;
  scanned: number;
  /** Full detail on what dropped, not just the count. */
  droppedGames: { id: number; name: string; deletedProductCount: number }[];
}

/** Bounds the "scan newly added games" step regardless of caller, since the cron path has to share its 60s ceiling with the main scan batch that runs after this. */
const NEW_GAME_SCAN_BUDGET_MS = 15_000;

export async function syncBggCollection(
  newGameScanBudgetMs: number = NEW_GAME_SCAN_BUDGET_MS
): Promise<CollectionSyncResult | null> {
  const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
  if (!settings?.bggSessionId || !settings.bggUsername) return null;

  const { games, cookieJar } = await getBggCollection(settings.bggUsername, settings.bggSessionId);

  const existingBggIds = new Set((await prisma.game.findMany({ select: { bggId: true } })).map((g) => g.bggId));
  const newBggIds = games.filter((g) => !existingBggIds.has(g.bggId)).map((g) => g.bggId);

  // Each upsert targets a distinct bggId, so these are safe to run
  // concurrently instead of one round trip at a time.
  await Promise.all(
    games.map((g) =>
      prisma.game.upsert({
        where: { bggId: g.bggId },
        update: {
          name: g.name,
          yearPublished: g.yearPublished,
          thumbnail: g.thumbnail,
          image: g.image,
          inCollection: true,
        },
        create: {
          bggId: g.bggId,
          name: g.name,
          yearPublished: g.yearPublished,
          thumbnail: g.thumbnail,
          image: g.image,
        },
      })
    )
  );

  let scannedCount = 0;
  if (newBggIds.length) {
    // A scan hiccup for one new game shouldn't stop the dropped-game
    // detection or lastCollectionSync from being recorded below.
    const newGames = await prisma.game.findMany({ where: { bggId: { in: newBggIds } } });
    scannedCount = await scanGamesWithBudget(newGames, newGameScanBudgetMs)
      .then((r) => r.scanned)
      .catch(() => 0);
  }

  const importedIds = new Set(games.map((g) => g.bggId));
  const existing = await prisma.game.findMany({
    where: { inCollection: true },
    include: { products: { include: { games: { select: { id: true } } } } },
  });
  // The miscellaneous pseudo-game will never appear in a real BGG
  // collection response, so it'd otherwise get marked dropped on every sync.
  const dropped = existing.filter((g) => !importedIds.has(g.bggId) && g.bggId !== MISC_GAME_BGG_ID);

  const deletedCountByGameId = new Map<number, number>();
  if (dropped.length) {
    // Solo-owned products (this dropped game is their only link) are
    // deleted outright. A product also saved against a still-active game
    // just keeps existing as-is, link to the dropped game and all -- it's
    // still legitimately saved for that other game, and the dropped game
    // is only soft-removed (inCollection: false), not deleted, so there's
    // no dangling-reference concern in leaving the link alone.
    const soloProductIds: number[] = [];
    for (const g of dropped) {
      const solo = g.products.filter((p) => p.games.length === 1);
      deletedCountByGameId.set(g.id, solo.length);
      soloProductIds.push(...solo.map((p) => p.id));
    }
    await prisma.$transaction([
      ...(soloProductIds.length ? [prisma.product.deleteMany({ where: { id: { in: soloProductIds } } })] : []),
      prisma.game.updateMany({ where: { id: { in: dropped.map((g) => g.id) } }, data: { inCollection: false } }),
    ]);
  }

  // BGG appears to rotate the session cookie on use, so persist whatever
  // came back rather than letting the next request resend a stale one.
  await prisma.settings.update({
    where: { id: "singleton" },
    data: { lastCollectionSync: new Date(), bggSessionId: cookieJar },
  });

  return {
    imported: games.length,
    removedFromCollection: dropped.length,
    newGames: newBggIds.length,
    scanned: scannedCount,
    droppedGames: dropped.map((g) => ({ id: g.id, name: g.name, deletedProductCount: deletedCountByGameId.get(g.id) ?? 0 })),
  };
}
