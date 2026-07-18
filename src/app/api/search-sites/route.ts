/**
 * POST /api/search-sites
 * Body: { gameId: number }
 * Runs every configured search provider for a game's name and marks which
 * results are already saved in the catalog.
 */
import { searchAllProviders } from "@/lib/providers";
import { getProviderCredentials } from "@/lib/providers/env-credentials";
import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const { gameId } = await request.json();
  const id = Number(gameId);
  if (!id) return Response.json({ error: "gameId is required." }, { status: 400 });

  const game = await prisma.game.findUnique({ where: { id } });
  if (!game) return Response.json({ error: "Game not found." }, { status: 404 });

  const outcomes = await searchAllProviders(game.name, getProviderCredentials());

  const urls = outcomes.flatMap((o) => o.results.map((r) => r.url));
  const existing = urls.length
    ? await prisma.product.findMany({ where: { url: { in: urls } }, select: { url: true } })
    : [];
  const savedUrls = new Set(existing.map((p) => p.url));

  const annotated = outcomes.map((o) => ({
    ...o,
    results: o.results.map((r) => ({ ...r, alreadySaved: savedUrls.has(r.url) })),
  }));

  return Response.json({ game: { id: game.id, name: game.name }, providers: annotated });
}
