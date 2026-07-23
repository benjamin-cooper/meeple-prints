export interface MiscSearchTerm {
  term: string;
  /**
   * null means the term itself is already precise enough (a specific brand
   * name) that the secondary tabletop-signal check below would do more harm
   * than good -- see the "wyrmwood" terms for why.
   */
  extraFilter: ((title: string) => boolean) | null;
}

// A second, independent layer on top of relevance.ts's per-term matching
// (which only checks a result against the one term that found it) --
// requires some unambiguous tabletop/gaming signal word to appear
// somewhere in the title too, so a borderline term like "insert organizer"
// can't slip through for something that's actually a kitchen or garage
// product. Known gap, same category as relevance.ts's own: a genuinely
// relevant listing that just doesn't happen to use any of these words in
// its title would still get excluded -- confirmed live for the "wyrmwood"
// terms below, where real results like "Tablet Mount for Wyrmwood Modular
// Game Table" don't contain any of these words at all, which is why those
// terms opt out of this check entirely instead of tightening the pattern.
const TABLETOP_SIGNAL_PATTERN =
  /\b(board\s*game|tabletop|dnd|d&d|ttrpg|rpg|tcg|meeple|dice|miniature|wargam\w*|card\s*game|dungeon\s*master|game\s*master|boardgame)\b/i;

export function hasTabletopSignal(title: string): boolean {
  return TABLETOP_SIGNAL_PATTERN.test(title);
}

/**
 * Search terms for the "Miscellaneous" pseudo-game: accessories that aren't
 * tied to any specific title. Kept deliberately narrow -- each generic term
 * is chosen so its own non-generic words (relevance.ts strips "board"/"game"
 * as filler, common to literally everything in this app) are themselves
 * already tabletop-specific, rather than reaching for a broad word like
 * "organizer" or "tray" alone that 3D-print sites are full of in totally
 * unrelated (kitchen, garage, office) contexts. The "wyrmwood" terms are a
 * different case -- a specific gaming-furniture brand name, precise enough
 * on its own that it skips the tabletop-signal check (see extraFilter above).
 */
export const MISC_SEARCH_TERMS: MiscSearchTerm[] = [
  { term: "dice tower", extraFilter: hasTabletopSignal },
  { term: "dice tray", extraFilter: hasTabletopSignal },
  { term: "meeple", extraFilter: hasTabletopSignal },
  { term: "dnd dice tray", extraFilter: hasTabletopSignal },
  { term: "board game insert organizer", extraFilter: hasTabletopSignal },
  { term: "tabletop miniature stand", extraFilter: hasTabletopSignal },
  { term: "card sleeve deck box", extraFilter: hasTabletopSignal },
  { term: "dungeon master screen", extraFilter: hasTabletopSignal },
  { term: "board game token tray", extraFilter: hasTabletopSignal },
  { term: "d20 dice holder", extraFilter: hasTabletopSignal },
  { term: "wyrmwood table", extraFilter: null },
  { term: "wyrmwood vault", extraFilter: null },
];
