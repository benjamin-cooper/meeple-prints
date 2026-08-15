/**
 * One-off cleanup for DiscoveredPrint rows that predate a
 * NON_3D_PRINT_TERM_GROUPS addition (see src/lib/providers/non-3d-print-terms.ts).
 * The exclusion only filters fresh Etsy search results going forward; it
 * never re-evaluates rows already cached as visible, so this closes that
 * gap the same way scripts/dedupe-existing.ts does for dedupe.ts.
 *
 * Run against whichever database DATABASE_URL points at:
 *   npx tsx scripts/purge-non-3d-print.ts            # local dev.db (default)
 *   DATABASE_URL=... DATABASE_AUTH_TOKEN=... npx tsx scripts/purge-non-3d-print.ts   # Turso prod
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { NON_3D_PRINT_PATTERN } from "../src/lib/providers/non-3d-print-terms";

async function main() {
  const rows = await prisma.discoveredPrint.findMany({
    where: { hidden: false, domain: "etsy.com" },
    select: { id: true, title: true },
  });

  const idsToHide = rows.filter((r) => NON_3D_PRINT_PATTERN.test(r.title)).map((r) => r.id);

  if (idsToHide.length === 0) {
    console.log("No non-3D-print rows found.");
    return;
  }

  await prisma.discoveredPrint.updateMany({
    where: { id: { in: idsToHide } },
    data: { hidden: true },
  });

  console.log(`Hid ${idsToHide.length} non-3D-print row(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
