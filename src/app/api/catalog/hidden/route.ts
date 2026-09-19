/**
 * GET /api/catalog/hidden
 * Every DiscoveredPrint marked hidden -- dismissed as "not relevant" or
 * dropped by the cross-domain dedupe -- for the review/un-hide page. Not
 * part of the main /api/catalog response since this is a maintenance view,
 * not everyday browsing.
 *
 * Each row also carries `autoExplanation`: whether a shipped rule already
 * accounts for it (same check scripts/tombstone-cleanup.ts deletes on), so
 * the page can separate "already covered, safe to ignore" from "hidden
 * with no rule behind it" -- the second group is exactly what every
 * collision-exclusion/content-type audit this project has done started
 * from, so surfacing it directly means that audit no longer needs a fresh
 * DB script each time.
 */
import { prisma } from "@/lib/prisma";
import { explainHiddenRows } from "@/lib/providers/hidden-explanation";

export async function GET() {
  const rows = await prisma.discoveredPrint.findMany({
    where: { hidden: true },
    orderBy: { lastSeenAt: "desc" },
    include: { game: { select: { id: true, name: true } } },
  });
  if (rows.length === 0) return Response.json([]);

  // The dedupe check needs every row in a hidden row's game, not just the
  // hidden ones, to know whether a hidden row lost to a still-visible
  // winner.
  const gameIds = [...new Set(rows.map((r) => r.gameId))];
  const allRowsInThoseGames = await prisma.discoveredPrint.findMany({
    where: { gameId: { in: gameIds } },
    select: {
      id: true, title: true, domain: true, url: true, ratingCount: true, likesCount: true, hidden: true,
      gameId: true, game: { select: { name: true } },
    },
  });
  const explained = explainHiddenRows(allRowsInThoseGames.map((r) => ({ ...r, gameName: r.game.name })));

  return Response.json(rows.map((r) => ({ ...r, autoExplanation: explained.get(r.id) ?? null })));
}
