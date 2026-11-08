/**
 * Hard-deletes hidden DiscoveredPrint rows that a shipped rule already
 * explains (see hidden-explanation.ts). Safe because the rule that explains
 * a row also stops it being re-discovered, so the tombstone has no job left.
 * Anything unexplained stays hidden -- `hidden` is the only thing keeping
 * the @@unique([gameId, url]) upsert from re-inserting it on the next scan.
 *
 * Shared by scripts/tombstone-cleanup.ts (manual) and the weekly cron.
 */
import { prisma } from "@/lib/prisma";
import { explainHiddenRows } from "@/lib/providers/hidden-explanation";

export async function runTombstoneCleanup(): Promise<number> {
  const allRows = await prisma.discoveredPrint.findMany({
    select: {
      id: true, title: true, domain: true, url: true, ratingCount: true, likesCount: true, hidden: true,
      gameId: true, game: { select: { name: true } },
    },
  });

  const explained = explainHiddenRows(allRows.map((r) => ({ ...r, gameName: r.game.name })));
  if (explained.size === 0) return 0;

  await prisma.discoveredPrint.deleteMany({ where: { id: { in: [...explained.keys()] } } });
  return explained.size;
}
