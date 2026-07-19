import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";

export async function GET() {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    include: { games: { select: { id: true, name: true, thumbnail: true, bggId: true } } },
  });
  return Response.json(products);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    url, title, description, thumbnailUrl, domain, siteName,
    type, creator, price, currency, isFree, status, rating, notes, tags,
    siteRating, siteRatingCount, siteLikesCount,
    gameIds,
  } = body ?? {};

  if (!url || !title || !domain) {
    return Response.json({ error: "url, title, and domain are required." }, { status: 400 });
  }
  if (!Array.isArray(gameIds) || gameIds.length === 0) {
    return Response.json({ error: "Attach at least one game." }, { status: 400 });
  }

  const existing = await prisma.product.findUnique({ where: { url } });
  if (existing) {
    return Response.json({ error: "That link is already saved." }, { status: 409 });
  }

  try {
    const product = await prisma.product.create({
      data: {
        url, title,
        description: description || null,
        thumbnailUrl: thumbnailUrl || null,
        domain, siteName: siteName || null,
        type: type || "other",
        creator: creator || null,
        price: price === "" || price == null ? null : Number(price),
        currency: currency || "USD",
        isFree: !!isFree,
        status: status || "wishlist",
        rating: rating || null,
        siteRating: siteRating ?? null,
        siteRatingCount: siteRatingCount ?? null,
        siteLikesCount: siteLikesCount ?? null,
        notes: notes || null,
        tags: tags ? JSON.stringify(tags) : null,
        games: { connect: gameIds.map((id: number) => ({ id })) },
      },
      include: { games: { select: { id: true, name: true, thumbnail: true, bggId: true } } },
    });
    return Response.json(product, { status: 201 });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
