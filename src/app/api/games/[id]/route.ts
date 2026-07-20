import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";

type Params = { params: Promise<{ id: string }> };

/**
 * Toggles a game's inCollection flag from the app itself, rather than only
 * ever being able to set it via a BGG sync detecting a real removal. Never
 * deletes the Game row or its prints -- same soft-removal semantics sync
 * already uses -- so it's freely reversible (from here, or by a future
 * sync if the game is still actually in your real BGG collection).
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const gameId = parseInt(id);
  if (isNaN(gameId)) return Response.json({ error: "Invalid id" }, { status: 400 });

  const body = await request.json();
  if (typeof body?.inCollection !== "boolean") {
    return Response.json({ error: "inCollection (boolean) is required." }, { status: 400 });
  }

  const game = await prisma.game.update({
    where: { id: gameId },
    data: { inCollection: body.inCollection },
  });
  return Response.json(game);
}

/**
 * Permanently deletes a game -- unlike PATCH inCollection above, this is
 * real and irreversible. Prints saved only against this game are deleted
 * with it (can't exist with zero games attached); a print also saved
 * against other games just loses this one link and survives, since it's
 * still legitimately saved for those. DiscoveredPrint rows cascade via the
 * schema's onDelete: Cascade on the gameId relation.
 */
export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const gameId = parseInt(id);
  if (isNaN(gameId)) return Response.json({ error: "Invalid id" }, { status: 400 });

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: { products: { include: { games: { select: { id: true } } } } },
  });
  if (!game) return Response.json({ error: "Not found" }, { status: 404 });

  const soloProductIds = game.products.filter((p) => p.games.length === 1).map((p) => p.id);
  if (soloProductIds.length) {
    await prisma.product.deleteMany({ where: { id: { in: soloProductIds } } });
  }
  await prisma.game.delete({ where: { id: gameId } });

  return Response.json({ ok: true, deletedProducts: soloProductIds.length });
}

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const gameId = parseInt(id);
  if (isNaN(gameId)) return Response.json({ error: "Invalid id" }, { status: 400 });

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      products: {
        orderBy: { createdAt: "desc" },
        include: { games: { select: { id: true, name: true, thumbnail: true, bggId: true } } },
      },
    },
  });
  if (!game) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(game);
}
