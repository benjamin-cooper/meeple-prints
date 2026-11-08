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
const RAW_MISC_SEARCH_TERMS: MiscSearchTerm[] = [
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

// Words in the part of a title before "board game" that mark a genuinely
// generic product ("Universal Board Game Organizer", "Gridfinity ...") rather
// than a game's name.
const GENERIC_BEFORE_BOARD_GAME =
  /\b(universal|generic|modular|customi[sz]able|custom|parametric|gridfinity|stackable|diy|best|ultimate|simple|compact|portable|foldable|printable|3d|tabletop|tray|trays|wooden|plastic|metal|acrylic|resin|magnetic|folding|hex|hexagonal)\b/i;

const GENERIC_AFTER_PHRASE = /^(and|for|with|storage|box|tray|set|kit|stl|file|files|3d|printable|universal|modular|v\d.*)$/i;

/**
 * Miscellaneous is for accessories that aren't tied to a title you own, but
 * "board game insert organizer" (and print-and-play listings) return almost
 * only things made for ONE specific game -- "Zombicide 2nd Edition Board Game
 * Organizer", "Snow Colony - Board Game Organizer / Insert" -- for games that
 * aren't in the collection, so they don't belong anywhere here. A name before
 * "board game" on an insert/organizer title is the tell; a bare "Board Game
 * Token Tray" or "Universal Board Game Organizer" has none. Known gap: a
 * game-specific insert that never says "board game" still gets through.
 */
export function isGameSpecificMiscResult(title: string): boolean {
  if (/print\s*(&|&amp;|and|n)\s*play/i.test(title)) return true;
  // "... insert for <Game> the board game": the name comes after, not before.
  if (/\bfor\b.{2,}\bthe\s+board\s*game\b/i.test(title)) return true;
  // "Board Game Insert Organizer Heroes of Land, Air & Sea ...": a title that
  // opens generically but is followed by a capitalised name.
  const named = /^board\s*game\s+(?:insert|organi[sz]er)(?:\s+(?:insert|organi[sz]er))?\s+(\S+)/i.exec(title);
  if (named && /^[A-Z]/.test(named[1]) && !GENERIC_AFTER_PHRASE.test(named[1])) return true;
  const match = /\bboard\s*game\b/i.exec(title);
  if (!match) return false;
  const before = title.slice(0, match.index);
  // A name in front of "board game" on any accessory type ("ICE Board Game
  // 2nd Edition Token Tray") means it was made for that one game.
  return /[a-z0-9]/i.test(before) && !GENERIC_BEFORE_BOARD_GAME.test(before);
}

export const MISC_SEARCH_TERMS: MiscSearchTerm[] = RAW_MISC_SEARCH_TERMS.map((t) => ({
  term: t.term,
  extraFilter: (title) => !isGameSpecificMiscResult(title) && (t.extraFilter?.(title) ?? true),
}));
