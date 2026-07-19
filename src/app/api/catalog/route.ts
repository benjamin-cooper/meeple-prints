/**
 * GET /api/catalog
 * Powers the Catalog page: every saved Product, plus every cached
 * DiscoveredPrint that hasn't been saved yet (a saved Product for the same
 * url takes precedence so nothing renders twice).
 */
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [products, discovered] = await Promise.all([
    prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      include: { games: { select: { id: true, name: true, thumbnail: true, bggId: true } } },
    }),
    prisma.discoveredPrint.findMany({
      where: { hidden: false },
      orderBy: { firstSeenAt: "desc" },
      include: { game: { select: { id: true, name: true, thumbnail: true, bggId: true } } },
    }),
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
      game: d.game,
      kind: "discovered" as const,
    }));

  return Response.json([...saved, ...notYetSaved]);
}
