import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
