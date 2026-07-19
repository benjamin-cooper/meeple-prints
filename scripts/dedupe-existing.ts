/**
 * One-off cleanup for DiscoveredPrint rows cached before cross-domain
 * dedupe existed (see src/lib/providers/dedupe.ts). Groups already-cached
 * rows by game and marks duplicate losers hidden, same rule the live scan
 * pipeline now applies going forward: keep the best-reviewed copy.
 *
 * Run against whichever database DATABASE_URL points at:
 *   npx tsx scripts/dedupe-existing.ts            # local dev.db (default)
 *   DATABASE_URL=... DATABASE_AUTH_TOKEN=... npx tsx scripts/dedupe-existing.ts   # Turso prod
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { findDuplicateIndices } from "../src/lib/providers/dedupe";

async function main() {
  const rows = await prisma.discoveredPrint.findMany({
    where: { hidden: false },
    select: { id: true, gameId: true, title: true, domain: true, ratingCount: true, likesCount: true },
  });

  const byGame = new Map<number, typeof rows>();
  for (const row of rows) {
    const list = byGame.get(row.gameId) ?? [];
    list.push(row);
    byGame.set(row.gameId, list);
  }

  const idsToHide: number[] = [];
  for (const gameRows of byGame.values()) {
    const dropIndices = findDuplicateIndices(gameRows);
    for (const i of dropIndices) idsToHide.push(gameRows[i].id);
  }

  if (idsToHide.length === 0) {
    console.log("No duplicates found.");
    return;
  }

  await prisma.discoveredPrint.updateMany({
    where: { id: { in: idsToHide } },
    data: { hidden: true },
  });

  console.log(`Hid ${idsToHide.length} duplicate print(s) across ${byGame.size} games.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
