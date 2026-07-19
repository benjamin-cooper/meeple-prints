/**
 * POST /api/catalog/unhide
 * Body: { id: number }
 * Reverses a dismiss (or a dedupe collapse) -- the next scan will keep
 * refreshing this row again since hidden is the only thing that changes.
 */
import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const { id } = await request.json();
  const printId = Number(id);
  if (!printId) return Response.json({ error: "id is required." }, { status: 400 });

  await prisma.discoveredPrint.update({ where: { id: printId }, data: { hidden: false } });
  return Response.json({ ok: true });
}
