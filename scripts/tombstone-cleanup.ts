/**
 * Hard-deletes DiscoveredPrint rows that are already hidden AND explained
 * by a shipped rule (a KNOWN_COLLISION_EXCLUSIONS match, a NON_3D_PRINT_PATTERN
 * match on Etsy, or a dedupe loser against a still-visible winner in the
 * same game). Safe to delete rather than just leave hidden: the rule that
 * explains each one also prevents it from ever being re-discovered and
 * re-inserted by a future scan, so there's no tombstone purpose left for
 * these specific rows. Anything NOT explained by a rule is left alone --
 * deleting those would let the same junk silently resurface on the next
 * scan, since `hidden` is the only thing currently preventing re-insertion
 * via the @@unique([gameId, url]) constraint.
 *
 * Run against whichever database DATABASE_URL points at:
 *   npx tsx scripts/tombstone-cleanup.ts            # local dev.db (default)
 *   DATABASE_URL=... DATABASE_AUTH_TOKEN=... npx tsx scripts/tombstone-cleanup.ts   # Turso prod
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { KNOWN_COLLISION_EXCLUSIONS } from "../src/lib/providers/known-collisions";
import { NON_3D_PRINT_PATTERN } from "../src/lib/providers/non-3d-print-terms";
import { findDuplicateIndices, type Dedupable } from "../src/lib/providers/dedupe";

async function main() {
  const allHidden = await prisma.discoveredPrint.findMany({
    where: { hidden: true },
    select: { id: true, title: true, domain: true, url: true, ratingCount: true, likesCount: true, game: { select: { id: true, name: true } } },
  });

  const explainedIds = new Set<number>();

  for (const r of allHidden) {
    const collisionRe = KNOWN_COLLISION_EXCLUSIONS[r.game.name];
    if (collisionRe && collisionRe.test(r.title)) {
      explainedIds.add(r.id);
      continue;
    }
    if (r.domain === "etsy.com" && NON_3D_PRINT_PATTERN.test(r.title)) {
      explainedIds.add(r.id);
    }
  }

  const byGame = new Map<number, { id: number; name: string }>();
  for (const r of allHidden) byGame.set(r.game.id, r.game);

  for (const game of byGame.values()) {
    const gameRows = await prisma.discoveredPrint.findMany({
      where: { gameId: game.id },
      select: { id: true, title: true, domain: true, url: true, ratingCount: true, likesCount: true, hidden: true },
    });
    const dedupable: (Dedupable & { id: number; hidden: boolean })[] = gameRows.map((r) => ({
      id: r.id, title: r.title, domain: r.domain, url: r.url, ratingCount: r.ratingCount, likesCount: r.likesCount, hidden: r.hidden,
    }));
    const toDrop = findDuplicateIndices(dedupable);
    for (const i of toDrop) {
      const row = dedupable[i];
      if (row.hidden) explainedIds.add(row.id);
    }
  }

  if (explainedIds.size === 0) {
    console.log("Nothing explained -- no tombstones to delete.");
    return;
  }

  await prisma.discoveredPrint.deleteMany({ where: { id: { in: [...explainedIds] } } });
  console.log(`Deleted ${explainedIds.size} explained tombstone row(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
