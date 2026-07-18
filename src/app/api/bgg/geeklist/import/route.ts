/**
 * POST /api/bgg/geeklist/import
 * Walks the community "3D Prints for Board Games" GeekList (186909) and
 * saves any linked print for a game already in the local collection.
 * Entries for games outside the collection, or posts with no linked
 * game, are skipped. This seeds a starting catalog, not a full mirror.
 */
import { getGeeklistItems, PRINTS_GEEKLIST_ID } from "@/lib/bgg";
import { guessTitleFromUrl } from "@/lib/url-title";
import { prisma } from "@/lib/prisma";
import { SITE_LABELS } from "@/lib/constants";

export async function POST() {
  const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
  if (!settings?.bggSessionId || !settings.bggUsername) {
    return Response.json({ error: "Connect your BGG account first." }, { status: 401 });
  }

  const games = await prisma.game.findMany({ where: { inCollection: true } });
  const gameByBggId = new Map(games.map((g) => [g.bggId, g]));
  if (gameByBggId.size === 0) {
    return Response.json({ error: "Import your BGG collection first, so entries have games to attach to." }, { status: 400 });
  }

  try {
    const { items, cookieJar } = await getGeeklistItems(PRINTS_GEEKLIST_ID, settings.bggSessionId);

    // Flatten every item's links into url -> the set of games it applies
    // to, deduping repeats up front instead of writing the same row twice.
    const gameIdsByUrl = new Map<string, Set<number>>();
    const domainByUrl = new Map<string, string>();
    let skippedNoGame = 0;

    for (const item of items) {
      if (!item.bggId || !gameByBggId.has(item.bggId)) {
        skippedNoGame++;
        continue;
      }
      const game = gameByBggId.get(item.bggId)!;
      for (const link of item.links) {
        if (!gameIdsByUrl.has(link.url)) {
          gameIdsByUrl.set(link.url, new Set());
          domainByUrl.set(link.url, link.domain);
        }
        gameIdsByUrl.get(link.url)!.add(game.id);
      }
    }

    // One batched read instead of a findUnique per link.
    const allUrls = Array.from(gameIdsByUrl.keys());
    const existingProducts = allUrls.length
      ? await prisma.product.findMany({
          where: { url: { in: allUrls } },
          include: { games: { select: { id: true } } },
        })
      : [];
    const existingByUrl = new Map(existingProducts.map((p) => [p.url, p]));

    let created = 0;
    let skippedDuplicate = 0;
    const writes: Promise<unknown>[] = [];

    for (const [url, gameIds] of gameIdsByUrl) {
      const existing = existingByUrl.get(url);
      if (existing) {
        const alreadyConnected = new Set(existing.games.map((g) => g.id));
        const toConnect = Array.from(gameIds).filter((id) => !alreadyConnected.has(id));
        if (toConnect.length === 0) {
          skippedDuplicate++;
          continue;
        }
        // Different product row per write, safe to run alongside the rest.
        writes.push(
          prisma.product.update({
            where: { id: existing.id },
            data: { games: { connect: toConnect.map((id) => ({ id })) } },
          })
        );
        continue;
      }

      const domain = domainByUrl.get(url)!;
      writes.push(
        prisma.product.create({
          data: {
            url,
            title: guessTitleFromUrl(url, domain),
            domain,
            siteName: SITE_LABELS[domain] ?? domain,
            source: "geeklist_import",
            games: { connect: Array.from(gameIds).map((id) => ({ id })) },
          },
        })
      );
      created++;
    }

    await Promise.all(writes);
    await prisma.settings.update({
      where: { id: "singleton" },
      data: { lastGeeklistSync: new Date(), bggSessionId: cookieJar },
    });

    return Response.json({ itemsScanned: items.length, created, skippedNoGame, skippedDuplicate });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: message.includes("expired") ? 401 : 502 });
  }
}
