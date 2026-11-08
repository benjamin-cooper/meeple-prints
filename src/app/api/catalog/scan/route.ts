/**
 * POST /api/catalog/scan
 * Powers Catalog's "Scan now" button. Gated by the normal session cookie
 * (POST requests already require one, see proxy.ts), so no extra auth
 * check is needed here.
 */
import { scanNextBatch } from "@/lib/scan";

export const maxDuration = 60;

export async function POST() {
  const limit = parseInt(process.env.AUTO_SCAN_BATCH_SIZE ?? "20") || 20;
  const result = await scanNextBatch(limit);
  return Response.json(result);
}
