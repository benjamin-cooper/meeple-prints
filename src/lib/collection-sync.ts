/**
 * Shared BGG collection sync: pulls the connected account's owned base
 * games, upserts them into the local Game table, marks anything that fell
 * out of the collection as inCollection=false (never deletes -- prints
 * already saved against a dropped game aren't lost), and gives newly added
 * games an immediate scan instead of waiting on the daily cron's
 * oldest-first queue. Used by both the manual "Sync now" button and the
 * daily cron, so collection sync isn't purely a manual action anymore.
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
  /** Full detail on what dropped, not just the count -- lets the manual "Sync now" flow offer a review step for permanently deleting any of them. */
  droppedGames: { id: number; name: string; productCount: number }[];
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
    include: { _count: { select: { products: true } } },
  });
  // The miscellaneous pseudo-game will never appear in a real BGG
  // collection response, so it'd otherwise get marked dropped on every sync.
  const dropped = existing.filter((g) => !importedIds.has(g.bggId) && g.bggId !== MISC_GAME_BGG_ID);
  if (dropped.length) {
    await prisma.game.updateMany({ where: { id: { in: dropped.map((g) => g.id) } }, data: { inCollection: false } });
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
    droppedGames: dropped.map((g) => ({ id: g.id, name: g.name, productCount: g._count.products })),
  };
}
