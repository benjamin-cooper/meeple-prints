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
