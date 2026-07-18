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
    const items = await getGeeklistItems(PRINTS_GEEKLIST_ID, settings.bggSessionId);

    let created = 0;
    let skippedNoGame = 0;
    let skippedDuplicate = 0;

    for (const item of items) {
      if (!item.bggId || !gameByBggId.has(item.bggId)) {
        skippedNoGame++;
        continue;
      }
      const game = gameByBggId.get(item.bggId)!;

      for (const link of item.links) {
        const existing = await prisma.product.findUnique({ where: { url: link.url } });
        if (existing) {
          if (!(await prisma.game.findFirst({ where: { id: game.id, products: { some: { id: existing.id } } } }))) {
            await prisma.product.update({ where: { id: existing.id }, data: { games: { connect: { id: game.id } } } });
          } else {
            skippedDuplicate++;
          }
          continue;
        }

        await prisma.product.create({
          data: {
            url: link.url,
            title: guessTitleFromUrl(link.url, link.domain),
            domain: link.domain,
            siteName: SITE_LABELS[link.domain] ?? link.domain,
            source: "geeklist_import",
            games: { connect: { id: game.id } },
          },
        });
        created++;
      }
    }

    await prisma.settings.update({ where: { id: "singleton" }, data: { lastGeeklistSync: new Date() } });

    return Response.json({ itemsScanned: items.length, created, skippedNoGame, skippedDuplicate });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: message.includes("expired") ? 401 : 502 });
  }
}
