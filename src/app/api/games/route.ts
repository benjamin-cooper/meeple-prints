import { prisma } from "@/lib/prisma";

export async function GET() {
  const games = await prisma.game.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });
  return Response.json(games);
}
