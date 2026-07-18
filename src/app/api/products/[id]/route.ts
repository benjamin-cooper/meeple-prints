import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const productId = parseInt(id);
  if (isNaN(productId)) return Response.json({ error: "Invalid id" }, { status: 400 });

  const body = await request.json();
  const {
    title, description, thumbnailUrl, type, creator,
    price, currency, isFree, status, rating, notes, tags, gameIds,
  } = body ?? {};

  const data: Record<string, unknown> = {};
  if (title !== undefined) data.title = title;
  if (description !== undefined) data.description = description;
  if (thumbnailUrl !== undefined) data.thumbnailUrl = thumbnailUrl;
  if (type !== undefined) data.type = type;
  if (creator !== undefined) data.creator = creator;
  if (price !== undefined) data.price = price === "" || price === null ? null : Number(price);
  if (currency !== undefined) data.currency = currency;
  if (isFree !== undefined) data.isFree = !!isFree;
  if (status !== undefined) data.status = status;
  if (rating !== undefined) data.rating = rating === "" ? null : rating;
  if (notes !== undefined) data.notes = notes;
  if (tags !== undefined) data.tags = tags ? JSON.stringify(tags) : null;
  if (Array.isArray(gameIds)) data.games = { set: gameIds.map((gid: number) => ({ id: gid })) };

  try {
    const product = await prisma.product.update({
      where: { id: productId },
      data,
      include: { games: { select: { id: true, name: true, thumbnail: true, bggId: true } } },
    });
    return Response.json(product);
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const productId = parseInt(id);
  if (isNaN(productId)) return Response.json({ error: "Invalid id" }, { status: 400 });

  await prisma.product.delete({ where: { id: productId } });
  return Response.json({ ok: true });
}
