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

  const games = await prisma.game.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });
  return Response.json(games);
}
