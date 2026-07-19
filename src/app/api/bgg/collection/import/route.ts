/**
 * POST /api/bgg/collection/import
 * The manual "Sync now" button on Connect. The same sync also runs daily
 * from the cron (see src/app/api/cron/scan/route.ts) so this isn't the
 * only way it happens anymore -- this route exists for "I don't want to
 * wait for the daily sweep" and for surfacing a real error (e.g. an
 * expired BGG session) directly to the person who can fix it.
 */
import { syncBggCollection } from "@/lib/collection-sync";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60;

export async function POST() {
  const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
  if (!settings?.bggSessionId || !settings.bggUsername) {
    return Response.json({ error: "Connect your BGG account first." }, { status: 401 });
  }

  try {
    const result = await syncBggCollection();
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: message.includes("expired") ? 401 : 502 });
  }
}
