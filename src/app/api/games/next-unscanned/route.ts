/**
 * GET /api/games/next-unscanned?limit=5
 * Games ordered so ones never scanned (or scanned longest ago) come first,
 * for paging through the whole collection in batches.
 */
import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get("limit") ?? "5") || 5, 25);

  // SQLite orders NULL as smallest, so never-scanned games naturally sort first.
  const games = await prisma.game.findMany({
    where: { inCollection: true },
    orderBy: [{ lastScannedAt: "asc" }, { name: "asc" }],
    take: limit,
  });

  return Response.json(games);
}
