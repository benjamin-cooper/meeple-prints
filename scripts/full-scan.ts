/**
 * One-off full sweep of every game in the collection, ignoring the daily
 * cron's batch-size cap. Useful right after deploying the auto-scan
 * feature so Catalog doesn't have to wait ~7 days to catch up.
 *
 * Run against whichever database DATABASE_URL points at:
 *   npx tsx scripts/full-scan.ts            # local dev.db (default)
 *   DATABASE_URL=... DATABASE_AUTH_TOKEN=... npx tsx scripts/full-scan.ts   # Turso prod
 */
import "dotenv/config";
import { scanAll } from "../src/lib/scan";

async function main() {
  const result = await scanAll((done, total, name) => {
    process.stdout.write(`[${done + 1}/${total}] ${name}\n`);
  });
  console.log(`\nDone. Scanned ${result.scanned} games, found ${result.newPrints} new prints.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
