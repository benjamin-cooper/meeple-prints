/**
 * GET /api/cron/scan
 * Triggered daily by Vercel Cron (see vercel.json), which invokes cron
 * paths with GET. Vercel sends "Authorization: Bearer $CRON_SECRET"
 * automatically when CRON_SECRET is set, which is how this route confirms
 * the request actually came from Vercel's scheduler and not a public
 * crawler hitting the same path. This path is listed in PUBLIC_PATHS in
 * proxy.ts (it has no browser session to check), so this bearer check is
 * its only protection.
 */
import { scanNextBatch, DEFAULT_BATCH_TIME_BUDGET_MS } from "@/lib/scan";
import { syncBggCollection } from "@/lib/collection-sync";
import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  // Collection sync used to be manual-only, so it's easy to forget and the
  // catalog quietly goes stale. It now runs here too, sharing this route's
  // 60s ceiling with the scan batch below -- a sync hiccup shouldn't block
  // scanning, so it's best-effort and time-boxed on its own.
  const cronStart = Date.now();
  await syncBggCollection().catch(() => null);
  const remainingBudget = Math.max(5_000, DEFAULT_BATCH_TIME_BUDGET_MS - (Date.now() - cronStart));

  const limit = parseInt(process.env.AUTO_SCAN_BATCH_SIZE ?? "10") || 10;
  const result = await scanNextBatch(limit, remainingBudget);

  // Only the real scheduled cron sets this -- not the manual "Scan now"
  // button or a one-off script -- so it reflects whether Vercel's
  // scheduler is actually still firing, not just whether scanning happened.
  await prisma.settings.upsert({
    where: { id: "singleton" },
    update: { lastCronRunAt: new Date() },
    create: { id: "singleton", lastCronRunAt: new Date() },
  });

  return Response.json(result);
}
