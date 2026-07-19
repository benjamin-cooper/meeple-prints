/**
 * Makers commonly cross-post the same physical model to two or three sites
 * with a near-identical (sometimes slightly reworded) title. Detects those
 * cross-domain duplicates by title similarity and keeps only the
 * best-reviewed copy. Shared by the live search pipeline
 * (searchAllProviders) and the one-off cleanup script for prints already
 * cached before this existed.
 */
export interface Dedupable {
  title: string;
  domain: string;
  ratingCount: number | null;
  likesCount: number | null;
}

// Deliberately high. Auditing real data at 0.7 showed genuinely different
// product variants scoring 0.67-0.80 on plain bag-of-words overlap -- e.g.
// "Ark Nova Insert" vs "Ark Nova Deluxe Insert" (different edition, not
// interchangeable) and "Bitoku Game Organizer WITH EXPANSION" vs "...(no
// expansion)" (literally opposite variants; "no"/"with" barely move the
// token-overlap score). A missed true duplicate just leaves an extra card
// in the grid; a wrongly-hidden distinct edition actively hides the one
// listing someone needs. Bias hard toward precision.
const SIMILARITY_THRESHOLD = 0.85;

function tokenize(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean)
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  const intersection = [...a].filter((t) => b.has(t)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Reviews beat likes regardless of raw count -- a real rating ("if
 * possible") outranks a larger like count, since it's a stronger signal
 * that someone actually printed and used the thing. Only falls back to
 * comparing likes when neither candidate has a rating.
 */
function engagementRank(item: Dedupable): [number, number] {
  if (item.ratingCount != null) return [2, item.ratingCount];
  if (item.likesCount != null) return [1, item.likesCount];
  return [0, 0];
}

function beats(a: Dedupable, b: Dedupable): boolean {
  const [tierA, countA] = engagementRank(a);
  const [tierB, countB] = engagementRank(b);
  return tierA !== tierB ? tierA > tierB : countA > countB;
}

/** Indices of items to drop, keeping the best-ranked item in each cross-domain duplicate cluster. */
export function findDuplicateIndices<T extends Dedupable>(items: T[]): Set<number> {
  const tokenSets = items.map((i) => tokenize(i.title));
  const toDrop = new Set<number>();

  for (let i = 0; i < items.length; i++) {
    if (toDrop.has(i)) continue;
    for (let j = i + 1; j < items.length; j++) {
      if (toDrop.has(j)) continue;
      if (items[i].domain === items[j].domain) continue;
      if (jaccard(tokenSets[i], tokenSets[j]) < SIMILARITY_THRESHOLD) continue;

      const loserIsI = beats(items[j], items[i]);
      toDrop.add(loserIsI ? i : j);
      if (loserIsI) break;
    }
  }

  return toDrop;
}
