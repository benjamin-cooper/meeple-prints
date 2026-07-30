/**
 * Games whose name is also a well-known other franchise/IP/brand --
 * relevance.ts's title-word-match has no way to know a genuinely
 * well-made 3D-print result is about that OTHER thing, not this board
 * game (a real Halo "Covenant" faction miniature, a real Counter-Strike
 * "Inferno" map model, a real Mozart "Lacrimosa" piano sheet). Unlike the
 * generic tabletop-signal check (misc-terms.ts's hasTabletopSignal,
 * rejected for regular games -- see etsy.ts's own comment on why), these
 * are negative exclusions on a specific, unambiguous marker, so they
 * can't accidentally cut a real result the way a positive requirement
 * would: a real "Covenant" board-game accessory would never legitimately
 * mention "Halo". Verified each pattern against every currently-visible
 * result for its game before adding (2026-07-30) -- the only two matches
 * found were themselves more of the same collision noise, not real hits.
 *
 * Deliberately NOT built for every collision-prone game -- only ones with
 * an identifiable other-thing to exclude on. "Earth", "Sand", "Luthier",
 * "Galileo Galilei", "Forestry", "Black Forest", and "Funfair" are pure
 * word collisions (a real globe of Earth, real forestry equipment, a real
 * historical-figure bust) with no other franchise/brand to key off of --
 * those stay in the unfixable bucket, same reasoning as etsy.ts.
 */
export const KNOWN_COLLISION_EXCLUSIONS: Record<string, RegExp> = {
  Covenant: /halo|vhorlath|darkmoon|xenomorph|prometheus|\balien\b|ark of the covenant|indiana jones|\bneca\b/i,
  Inferno: /cs:?go|\bcs2\b|\bdante\b|botticelli|fortnite|arcadia quest/i,
  Recall: /\bhonda\b|\bacura\b|total recall|schwarzenegger|johnny cab|\bquaid\b|heroquest|ultima online|\bnerf\b/i,
  Lacrimosa: /neverness to everness|\bnte\b|ys viii|\bmozart\b|\brequiem\b|piano (sheet music|lesson)/i,
  "Tag Team": /pokemon go|heroquest|\bwwf\b|funko pop/i,
  "The Anarchy": /sons of anarchy|marvel|spiderpunk/i,
  Falling: /under falling skies/i,
  Speakeasy: /murder mystery|speakeasy arms/i,
};
