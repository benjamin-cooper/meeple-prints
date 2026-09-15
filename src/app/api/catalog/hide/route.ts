/**
 * POST /api/catalog/hide
 * Body: { id: number, reason?: string }
 * Dismisses a discovered print as "not relevant" -- e.g. a search hit that
 * matched on a generic word the relevance filter can't tell apart from the
 * game's own name (Covenant the board game vs. "Iron Covenant" the fantasy
 * faction). Scans never reset this back to false, so it stays gone.
 * `reason` is one of HIDE_REASONS' values, captured so a future audit of
 * what's piled up in Hidden doesn't have to re-derive intent from titles.
 */
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { parseJsonBody } from "@/lib/api-utils";
import { HIDE_REASONS } from "@/lib/constants";
import type { NextRequest } from "next/server";

const VALID_REASONS = new Set<string>(HIDE_REASONS.map((r) => r.value));

export async function POST(request: NextRequest) {
  const body = await parseJsonBody<{ id?: number; reason?: string }>(request);
  if (!body) return Response.json({ error: "Invalid request body." }, { status: 400 });
  const printId = Number(body.id);
  if (!printId) return Response.json({ error: "id is required." }, { status: 400 });
  const reason = body.reason && VALID_REASONS.has(body.reason) ? body.reason : null;

  try {
    await prisma.discoveredPrint.update({ where: { id: printId }, data: { hidden: true, hideReason: reason } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return Response.json({ error: "That print doesn't exist." }, { status: 404 });
    }
    throw err;
  }
  return Response.json({ ok: true });
}
