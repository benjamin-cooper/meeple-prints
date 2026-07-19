/**
 * POST /api/bgg/collection/import
 * Pulls the connected BGG account's owned base games and upserts them
 * into the local Game table. Games that fell out of the BGG collection
 * are marked inCollection=false rather than deleted, so any prints
 * already saved against them aren't lost. Newly added games get an
 * immediate scan (capped, see below) instead of waiting on the daily
 * cron's oldest-first queue.
 */
import { getBggCollection } from "@/lib/bgg";
import { scanGame } from "@/lib/scan";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60;

export async function POST() {
  const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
  if (!settings?.bggSessionId || !settings.bggUsername) {
    return Response.json({ error: "Connect your BGG account first." }, { status: 401 });
  }

  try {
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
      const batchSize = parseInt(process.env.AUTO_SCAN_BATCH_SIZE ?? "10") || 10;
      const newGames = await prisma.game.findMany({ where: { bggId: { in: newBggIds } }, take: batchSize });
      for (const game of newGames) {
        await scanGame(game).catch(() => {});
        scannedCount++;
        await new Promise((r) => setTimeout(r, 400));
      }
    }

    const importedIds = new Set(games.map((g) => g.bggId));
    const existing = await prisma.game.findMany({ where: { inCollection: true } });
    const droppedIds = existing.filter((g) => !importedIds.has(g.bggId)).map((g) => g.id);
    if (droppedIds.length) {
      await prisma.game.updateMany({ where: { id: { in: droppedIds } }, data: { inCollection: false } });
    }

    // BGG appears to rotate the session cookie on use, so persist whatever
    // came back rather than letting the next request resend a stale one.
    await prisma.settings.update({
      where: { id: "singleton" },
      data: { lastCollectionSync: new Date(), bggSessionId: cookieJar },
    });

    return Response.json({
      imported: games.length,
      removedFromCollection: droppedIds.length,
      newGames: newBggIds.length,
      scanned: scannedCount,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: message.includes("expired") ? 401 : 502 });
  }
}
