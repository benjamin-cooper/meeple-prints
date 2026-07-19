/**
 * GET /api/cron/scan
 * Triggered daily by Vercel Cron (see vercel.json), which invokes cron
 * paths with GET. Vercel sends "Authorization: Bearer $CRON_SECRET"
 * automatically when CRON_SECRET is set, which is how this route confirms
 * the request actually came from Vercel's scheduler and not a public
 * crawler hitting the same path. GET requests skip the session-cookie gate
 * in proxy.ts, so this bearer check is this route's only protection.
 */
import { scanNextBatch } from "@/lib/scan";
import type { NextRequest } from "next/server";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const limit = parseInt(process.env.AUTO_SCAN_BATCH_SIZE ?? "10") || 10;
  const result = await scanNextBatch(limit);

  return Response.json(result);
}
