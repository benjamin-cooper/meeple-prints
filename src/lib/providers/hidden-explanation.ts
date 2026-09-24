import { KNOWN_COLLISION_EXCLUSIONS, WARGAMING_SCALE_PATTERN } from "./known-collisions";
import { NON_3D_PRINT_PATTERN } from "./non-3d-print-terms";
import { findDuplicateIndices, type Dedupable } from "./dedupe";

export type AutoExplanation = "collision" | "not-3d-print" | "duplicate";

interface RowForExplanation extends Dedupable {
  id: number;
  hidden: boolean;
  gameId: number;
  gameName: string;
}

/**
 * For a set of hidden rows (and every other row in their games, needed for
 * the dedupe check), works out whether a shipped rule already explains
 * each one -- the same three checks scripts/tombstone-cleanup.ts deletes
 * on, factored out so the Hidden page can show the same verdict without
 * deleting anything. A row with no entry here is genuinely unexplained:
 * nothing currently stops it from being re-discovered by a future scan.
 */
export function explainHiddenRows(allRowsAcrossGames: RowForExplanation[]): Map<number, AutoExplanation> {
  const explained = new Map<number, AutoExplanation>();

  for (const r of allRowsAcrossGames) {
    if (!r.hidden) continue;
    const collisionRe = KNOWN_COLLISION_EXCLUSIONS[r.gameName];
    if (collisionRe && collisionRe.test(r.title)) {
      explained.set(r.id, "collision");
      continue;
    }
    if (WARGAMING_SCALE_PATTERN.test(r.title)) {
      explained.set(r.id, "collision");
      continue;
    }
    if (r.domain === "etsy.com" && NON_3D_PRINT_PATTERN.test(r.title)) {
      explained.set(r.id, "not-3d-print");
    }
  }

  const byGame = new Map<number, RowForExplanation[]>();
  for (const r of allRowsAcrossGames) {
    const list = byGame.get(r.gameId) ?? [];
    list.push(r);
    byGame.set(r.gameId, list);
  }
  for (const gameRows of byGame.values()) {
    const toDrop = findDuplicateIndices(gameRows);
    for (const i of toDrop) {
      const row = gameRows[i];
      if (row.hidden && !explained.has(row.id)) explained.set(row.id, "duplicate");
    }
  }

  return explained;
}
