import { prisma } from "@/lib/prisma";
import { MISC_GAME_BGG_ID, MISC_GAME_NAME } from "@/lib/constants";

export async function GET() {
  // Ensures the miscellaneous pseudo-game exists without needing a separate
  // seed script -- cheap no-op upsert once it's there, and this is the one
  // route every page that needs the games list already calls.
  await prisma.game.upsert({
    where: { bggId: MISC_GAME_BGG_ID },
    update: {},
    create: { bggId: MISC_GAME_BGG_ID, name: MISC_GAME_NAME, inCollection: true },
  });

  const [games, discoveredCounts] = await Promise.all([
    prisma.game.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { products: true } } },
    }),
    prisma.discoveredPrint.groupBy({ by: ["gameId", "hidden"], _count: { _all: true } }),
  ]);

  const statsByGame = new Map<number, { total: number; hidden: number }>();
  for (const row of discoveredCounts) {
    const entry = statsByGame.get(row.gameId) ?? { total: 0, hidden: 0 };
    entry.total += row._count._all;
    if (row.hidden) entry.hidden += row._count._all;
    statsByGame.set(row.gameId, entry);
  }

  const withStats = games.map((g) => ({
    ...g,
    discoveredStats: statsByGame.get(g.id) ?? { total: 0, hidden: 0 },
  }));
  return Response.json(withStats);
}
