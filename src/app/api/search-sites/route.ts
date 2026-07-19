/**
 * POST /api/search-sites
 * Body: { gameId: number }
 * Runs every configured search provider for a game's name, caches relevant
 * hits as DiscoveredPrint rows, and marks which results are already saved.
 */
import { scanGame } from "@/lib/scan";
import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const { gameId } = await request.json();
  const id = Number(gameId);
  if (!id) return Response.json({ error: "gameId is required." }, { status: 400 });

  const game = await prisma.game.findUnique({ where: { id } });
  if (!game) return Response.json({ error: "Game not found." }, { status: 404 });

  const annotated = await scanGame(game);

  return Response.json({ game: { id: game.id, name: game.name }, providers: annotated });
}
