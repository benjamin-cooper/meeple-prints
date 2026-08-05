/**
 * GET /api/catalog
 * Powers the Catalog page: every saved Product, plus every cached
 * DiscoveredPrint that hasn't been saved yet (a saved Product for the same
 * url takes precedence so nothing renders twice).
 *
 * Saved products stay visible even for a game that's since been removed
 * from the BGG collection -- removing a game is explicitly documented
 * (games/[id] DELETE, the Connect page's dropped-game review dialog) to
 * never touch anything already saved. But a not-yet-saved DiscoveredPrint
 * has no such claim on staying around: it's just cache from before the
 * removal, for a game that isn't even getting rescanned anymore
 * (scanNextBatch/scanAll both already exclude inCollection: false games),
 * so it would otherwise linger in the main Catalog view forever with no
 * indication the game was ever removed. Confirmed live: a dropped game's
 * old discovered prints kept showing up in Catalog after a resync that had
 * correctly marked the game itself inCollection: false.
 */
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [products, discovered, hiddenCount] = await Promise.all([
    prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      include: { games: { select: { id: true, name: true, thumbnail: true, bggId: true } } },
    }),
    prisma.discoveredPrint.findMany({
      where: { hidden: false, game: { inCollection: true } },
      orderBy: { firstSeenAt: "desc" },
      include: { game: { select: { id: true, name: true, thumbnail: true, bggId: true } } },
    }),
    prisma.discoveredPrint.count({ where: { hidden: true } }),
  ]);

  const savedUrls = new Set(products.map((p) => p.url));

  const saved = products.map((p) => ({ ...p, kind: "saved" as const }));
  const notYetSaved = discovered
    .filter((d) => !savedUrls.has(d.url))
    .map((d) => ({
      id: d.id,
      url: d.url,
      title: d.title,
      thumbnailUrl: d.thumbnailUrl,
      domain: d.domain,
      siteName: d.siteName,
      type: d.type,
      creator: d.creator,
      price: d.price,
      currency: d.currency,
      isFree: d.isFree,
      rating: d.rating,
      ratingCount: d.ratingCount,
      likesCount: d.likesCount,
      createdAt: d.firstSeenAt,
      lastSeenAt: d.lastSeenAt,
      game: d.game,
      kind: "discovered" as const,
    }));

  return Response.json({ items: [...saved, ...notYetSaved], hiddenCount });
}
