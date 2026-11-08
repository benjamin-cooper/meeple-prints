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
import { scanNextBatch, scanMiscIfStale, DEFAULT_BATCH_TIME_BUDGET_MS } from "@/lib/scan";
import { syncBggCollection } from "@/lib/collection-sync";
import { runTombstoneCleanup } from "@/lib/tombstone";
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
  const sync = await syncBggCollection(undefined, { unattended: true }).catch((err) => {
    // Swallowed so scanning still runs, but not silently -- a sync that
    // fails every night (expired BGG session) was otherwise invisible.
    console.error("[cron] collection sync failed:", err instanceof Error ? err.message : err);
    return null;
  });

  // Weekly (Sundays, UTC): delete hidden rows that a shipped rule already
  // explains. Used to be a manual script that had to be remembered after
  // every rules change; the Hidden page's "explained" verdicts and this use
  // the same explainHiddenRows, so nothing unexplained is ever touched.
  let tombstonesDeleted: number | null = null;
  if (new Date().getUTCDay() === 0) {
    tombstonesDeleted = await runTombstoneCleanup().catch((err) => {
      console.error("[cron] tombstone cleanup failed:", err instanceof Error ? err.message : err);
      return null;
    });
  }

  // Miscellaneous is outside the normal rotation; refresh it when it's
  // stale and there's comfortably room left in this run's 60s ceiling.
  let miscScanned = false;
  if (Date.now() - cronStart < 15_000) {
    miscScanned = await scanMiscIfStale().catch((err) => {
      console.error("[cron] miscellaneous scan failed:", err instanceof Error ? err.message : err);
      return false;
    });
  }
  const remainingBudget = Math.max(5_000, DEFAULT_BATCH_TIME_BUDGET_MS - (Date.now() - cronStart));

  const limit = parseInt(process.env.AUTO_SCAN_BATCH_SIZE ?? "20") || 20;
  const result = await scanNextBatch(limit, remainingBudget);

  // Only the real scheduled cron sets this -- not the manual "Scan now"
  // button or a one-off script -- so it reflects whether Vercel's
  // scheduler is actually still firing, not just whether scanning happened.
  await prisma.settings.upsert({
    where: { id: "singleton" },
    update: { lastCronRunAt: new Date() },
    create: { id: "singleton", lastCronRunAt: new Date() },
  });

  return Response.json({
    ...result,
    tombstonesDeleted,
    miscScanned,
    dropDetectionSkipped: sync?.dropDetectionSkipped ?? null,
  });
}
