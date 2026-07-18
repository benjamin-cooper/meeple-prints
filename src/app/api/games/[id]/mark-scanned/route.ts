import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gameId = parseInt(id);
  if (isNaN(gameId)) return Response.json({ error: "Invalid id" }, { status: 400 });

  await prisma.game.update({ where: { id: gameId }, data: { lastScannedAt: new Date() } });
  return Response.json({ ok: true });
}
