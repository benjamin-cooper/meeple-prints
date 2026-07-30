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
 * A second group below doesn't have a single other franchise/brand to key
 * off of, but does have its own consistent *domain vocabulary* -- checked
 * what a genuinely correct match looks like for each of these games first
 * (2026-07-30): it's almost always just "Insert"/"Organizer"/"Board Game
 * Insert", nothing else, while the noise clusters around real-world
 * industry/hobby/craft terms for that literal word (globes and topography
 * for "Earth", kinetic sand toys for "Sand", guitar-building tools for
 * "Luthier", historical-figure busts and astronomy instruments for
 * "Galileo Galilei", literal logging equipment for "Forestry", z-scale
 * model railway parts for "Funfair"). "Sand" specifically has zero
 * currently-correct results at all -- literally everything ever found for
 * it has been noise. Deliberately conservative about which words to
 * exclude on: skipped anything that could plausibly be real game theming
 * rather than pure collision, e.g. "cuckoo clock" for Black Forest (that
 * board game is actually about Black Forest cuckoo-clock making, so a
 * clock-themed piece could be a genuine accessory) and "guitar" for
 * Luthier (the board game is about being a luthier, so guitar-themed
 * pieces are plausibly real). Verified every pattern below against every
 * currently-visible result for its game -- zero risk in 6 of 7; the one
 * hit (a "Kermis Model Booster Ride" under Funfair) was itself more
 * z-scale model-railway noise, not a real result.
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
  Earth: /\bpuzzle\b|topograph|\bcoaster\b|\bglobe\b|\batlas\b|\belemental\b|\bepcot\b|spaceship earth/i,
  Sand: /sand dune|sand castle|\bsandbox\b|kinetic sand|sand mold|sand play|sand scoop|sand dollar|sand ladder|sand jacuzzi|sand filter|sand clock/i,
  Luthier: /radius block|\bclamps?\b|\bcello\b|headstock|\bc3po\b|nut files?|string spacer/i,
  "Galileo Galilei": /\bstatue\b|\bbust\b|portachiavi|\bkeychain\b|eppur si muove|\bstencil\b|pendulum clock|\bquadrants?\b|planetario|planetarium/i,
  Forestry: /relascope|angle gauge|densiometer|\bforwarder\b|\btyres?\b|\bdozer\b|\bgrapple\b|half-track|logging (equipment|truck)/i,
  "Black Forest": /schwarzwald|bollenhut|\bmug\b|\bbookmark\b|watermelon|battbox|vapor.*box/i,
  Funfair: /z-scale|\bnerf\b|teacup ride|\bcarousel\b|\bkermis\b|tornado carnival|toilet container|beer tent|ride seat/i,
};
