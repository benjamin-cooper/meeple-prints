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
import { MISC_GAME_NAME } from "@/lib/constants";
import { isGameSpecificMiscResult } from "@/lib/providers/misc-terms";
import { explainHiddenRows } from "@/lib/providers/hidden-explanation";

export async function runTombstoneCleanup(): Promise<number> {
  const allRows = await prisma.discoveredPrint.findMany({
    select: {
      id: true, title: true, domain: true, url: true, ratingCount: true, likesCount: true, hidden: true,
      gameId: true, game: { select: { name: true } },
    },
  });

  const explained = explainHiddenRows(allRows.map((r) => ({ ...r, gameName: r.game.name })));

  // Visible Miscellaneous rows for one specific game's insert/print-and-play
  // listing (see isGameSpecificMiscResult) aren't hidden, so the above never
  // sees them -- but the scan filter now stops them coming back, and the
  // Catalog already hides them at read time, so drop them from the table too.
  const ids = new Set(explained.keys());
  for (const r of allRows) {
    if (!r.hidden && r.game.name === MISC_GAME_NAME && isGameSpecificMiscResult(r.title)) ids.add(r.id);
  }
  if (ids.size === 0) return 0;

  await prisma.discoveredPrint.deleteMany({ where: { id: { in: [...ids] } } });
  return ids.size;
}
