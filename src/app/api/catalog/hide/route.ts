/**
 * POST /api/catalog/hide
 * Body: { id: number }
 * Dismisses a discovered print as "not relevant" -- e.g. a search hit that
 * matched on a generic word the relevance filter can't tell apart from the
 * game's own name (Covenant the board game vs. "Iron Covenant" the fantasy
 * faction). Scans never reset this back to false, so it stays gone.
 */
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const { id } = await request.json();
  const printId = Number(id);
  if (!printId) return Response.json({ error: "id is required." }, { status: 400 });

  try {
    await prisma.discoveredPrint.update({ where: { id: printId }, data: { hidden: true } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return Response.json({ error: "That print doesn't exist." }, { status: 404 });
    }
    throw err;
  }
  return Response.json({ ok: true });
}
