/**
 * GET /api/catalog/hidden
 * Every DiscoveredPrint marked hidden -- dismissed as "not relevant" or
 * dropped by the cross-domain dedupe -- for the review/un-hide page. Not
 * part of the main /api/catalog response since this is a maintenance view,
 * not everyday browsing.
 */
import { prisma } from "@/lib/prisma";

export async function GET() {
  const rows = await prisma.discoveredPrint.findMany({
    where: { hidden: true },
    orderBy: { lastSeenAt: "desc" },
    include: { game: { select: { id: true, name: true } } },
  });
  return Response.json(rows);
}
