/**
 * Search terms for the "Miscellaneous" pseudo-game: accessories that aren't
 * tied to any specific title. Kept deliberately narrow -- each term is
 * chosen so its own non-generic words (relevance.ts strips "board"/"game"
 * as filler, common to literally everything in this app) are themselves
 * already tabletop-specific, rather than reaching for a broad word like
 * "organizer" or "tray" alone that 3D-print sites are full of in totally
 * unrelated (kitchen, garage, office) contexts.
 */
export const MISC_SEARCH_TERMS = [
  "dice tower",
  "dice tray",
  "meeple",
  "dnd dice tray",
  "board game insert organizer",
  "tabletop miniature stand",
  "card sleeve deck box",
  "dungeon master screen",
  "board game token tray",
  "d20 dice holder",
];

// A second, independent layer on top of relevance.ts's per-term matching
// (which only checks a result against the one term that found it) --
// requires some unambiguous tabletop/gaming signal word to appear
// somewhere in the title too, so a borderline term like "insert organizer"
// can't slip through for something that's actually a kitchen or garage
// product. Known gap, same category as relevance.ts's own: a genuinely
// relevant listing that just doesn't happen to use any of these words in
// its title would still get excluded.
const TABLETOP_SIGNAL_PATTERN =
  /\b(board\s*game|tabletop|dnd|d&d|ttrpg|rpg|tcg|meeple|dice|miniature|wargam\w*|card\s*game|dungeon\s*master|game\s*master|boardgame)\b/i;

export function hasTabletopSignal(title: string): boolean {
  return TABLETOP_SIGNAL_PATTERN.test(title);
}
