/**
 * Maintenance for ETSY_SIGNAL_REQUIRED_GAMES (known-collisions.ts). Run
 * against whichever database DATABASE_URL points at (add the Turso URL and
 * token for production):
 *   npx tsx scripts/etsy-signal-candidates.ts
 *
 * Prints (1) games that now meet the bar for the print-signal requirement
 * but aren't on the list, and (2) any listed game where a currently-visible
 * Etsy result would now be cut. The list is static on purpose: tombstone
 * cleanup deletes the hidden rows a game's noise was measured from, so a
 * live computation would switch itself off as soon as the cleanup worked.
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { ETSY_PRINT_SIGNAL, ETSY_SIGNAL_REQUIRED_GAMES } from "../src/lib/providers/known-collisions";

const MIN_HIDDEN = 8;
const MIN_HIDDEN_RATIO = 0.75;

async function main() {
  const rows = await prisma.discoveredPrint.findMany({
    where: { domain: "etsy.com" },
    select: { title: true, hidden: true, game: { select: { name: true } } },
  });

  const byGame = new Map<string, { visible: string[]; hidden: string[] }>();
  for (const r of rows) {
    const entry = byGame.get(r.game.name) ?? { visible: [], hidden: [] };
    (r.hidden ? entry.hidden : entry.visible).push(r.title);
    byGame.set(r.game.name, entry);
  }

  const candidates: string[] = [];
  const conflicts: string[] = [];
  for (const [name, { visible, hidden }] of byGame) {
    const total = visible.length + hidden.length;
    const listed = ETSY_SIGNAL_REQUIRED_GAMES.has(name);
    const lost = visible.filter((t) => !ETSY_PRINT_SIGNAL.test(t));
    if (listed && lost.length) conflicts.push(`${name}: would cut ${lost.length} visible -> ${lost.join(" // ")}`);
    if (!listed && hidden.length >= MIN_HIDDEN && hidden.length / total >= MIN_HIDDEN_RATIO) {
      const caught = hidden.filter((t) => !ETSY_PRINT_SIGNAL.test(t)).length;
      const safe = lost.length === 0;
      candidates.push(`${safe ? "ADD " : "SKIP"} ${name}: ${hidden.length}/${total} Etsy hidden, signal catches ${caught}, visible lost ${lost.length}${safe ? "" : " -> " + lost.join(" // ")}`);
    }
  }

  console.log(candidates.length ? candidates.join("\n") : "No unlisted games meet the bar.");
  console.log(conflicts.length ? `\nCONFLICTS on listed games:\n${conflicts.join("\n")}` : "\nNo listed game would cut a visible result.");
}

main().finally(() => prisma.$disconnect());
