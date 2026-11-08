/**
 * Hard-deletes DiscoveredPrint rows that are already hidden AND explained
 * by a shipped rule (see src/lib/providers/hidden-explanation.ts: a
 * KNOWN_COLLISION_EXCLUSIONS match, a NON_3D_PRINT_PATTERN match on Etsy,
 * or a dedupe loser against a still-visible winner in the same game).
 * Safe to delete rather than just leave hidden: the rule that explains
 * each one also prevents it from ever being re-discovered and re-inserted
 * by a future scan, so there's no tombstone purpose left for these
 * specific rows. Anything NOT explained by a rule is left alone --
 * deleting those would let the same junk silently resurface on the next
 * scan, since `hidden` is the only thing currently preventing re-insertion
 * via the @@unique([gameId, url]) constraint.
 *
 * Run against whichever database DATABASE_URL points at:
 *   npx tsx scripts/tombstone-cleanup.ts            # local dev.db (default)
 *   DATABASE_URL=... DATABASE_AUTH_TOKEN=... npx tsx scripts/tombstone-cleanup.ts   # Turso prod
 */
import "dotenv/config";
import { runTombstoneCleanup } from "../src/lib/tombstone";

runTombstoneCleanup()
  .then((n) => console.log(n === 0 ? "Nothing explained -- no tombstones to delete." : `Deleted ${n} explained tombstone row(s).`))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
