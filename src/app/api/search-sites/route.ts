/**
 * POST /api/search-sites
 * Body: { gameId: number }
 * Runs every configured search provider for a game's name, caches relevant
 * hits as DiscoveredPrint rows, and marks which results are already saved.
 * The miscellaneous pseudo-game gets its own curated query list instead of
 * searching the literal string "Miscellaneous".
 */
import { scanGame } from "@/lib/scan";
import { prisma } from "@/lib/prisma";
import { MISC_GAME_BGG_ID } from "@/lib/constants";
import { MISC_SEARCH_TERMS, hasTabletopSignal } from "@/lib/providers/misc-terms";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const { gameId } = await request.json();
  const id = Number(gameId);
  if (!id) return Response.json({ error: "gameId is required." }, { status: 400 });

  const game = await prisma.game.findUnique({ where: { id } });
  if (!game) return Response.json({ error: "Game not found." }, { status: 404 });

  const annotated =
    game.bggId === MISC_GAME_BGG_ID
      ? await scanGame(game, { queries: MISC_SEARCH_TERMS, extraFilter: hasTabletopSignal })
      : await scanGame(game);

  return Response.json({ game: { id: game.id, name: game.name }, providers: annotated });
}
