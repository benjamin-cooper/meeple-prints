/**
 * POST /api/catalog/unhide
 * Body: { id: number }
 * Reverses a dismiss (or a dedupe collapse) -- the next scan will keep
 * refreshing this row again since hidden is the only thing that changes.
 */
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const { id } = await request.json();
  const printId = Number(id);
  if (!printId) return Response.json({ error: "id is required." }, { status: 400 });

  try {
    await prisma.discoveredPrint.update({ where: { id: printId }, data: { hidden: false } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return Response.json({ error: "That print doesn't exist." }, { status: 404 });
    }
    throw err;
  }
  return Response.json({ ok: true });
}
