/**
 * Etsy sells finished physical products and non-3D-print digital files
 * (laser-cutter patterns, ebooks, party invitations, ...) under the same
 * search as real 3D-print STLs, and listing_type: "download" only tells
 * you "buying this gets you a file," not that the file is an STL. There's
 * no clean structured signal for this -- file_data on the full listing
 * detail is a vague string like "1 TXT", and getting it needs a third API
 * call per listing on top of search and images -- so this excludes on a
 * strong title/tag signal for a different content type instead. Same
 * category of accepted-imperfect heuristic as relevance.ts: known gap, a
 * listing that mentions e.g. "poster" only in passing (a bundle that
 * includes both an STL and a poster) could still be wrongly excluded.
 *
 * Most of these terms exist because a game's name is also an ordinary
 * English word, a real historical figure, or an event/party theme
 * ("Speakeasy", "Galileo Galilei", "Recall", "Hibachi") -- relevance.ts's
 * title-word-match has no way to know the game isn't what a listing is
 * actually about, so Etsy's own unrelated ebooks, party invitations, and
 * craft patterns pass it cleanly on name alone. This can only ever catch a
 * *content-type* mismatch, not a *subject* mismatch -- a listing can be a
 * completely genuine 3D-print file and still be wrong for the game, if the
 * game's name is also a real object/place/profession (a real "Galileo
 * Galilei" pendulum clock STL). A positive tabletop-signal requirement was
 * tried and rejected for that case (see known-collisions.ts's own comment)
 * -- it cut the majority of genuinely correct results for games like
 * "Speakeasy" or "Quacks of Quedlinburg", whose real listings just name the
 * game and the part, never the words "board game" or "tabletop".
 *
 * Structured as groups instead of one growing inline regex literal, so a
 * future audit's addition is a one-line array entry in the relevant group
 * instead of an edit to an already-enormous alternation. Compiled into a
 * single regex once at module load (see NON_3D_PRINT_PATTERN below) --
 * this only changes how the list is maintained, not the runtime check.
 * Every term here was verified against every currently-visible row in both
 * databases before being added, across eight systematic audits
 * (2026-07-21 through 2026-08-11) -- zero false-positive risk confirmed
 * live each time, not assumed.
 */
interface ExclusionGroup {
  category: string;
  /** Regex alternatives, without \b wrapping -- added once at compile time. */
  terms: string[];
}

export const NON_3D_PRINT_TERM_GROUPS: ExclusionGroup[] = [
  {
    category: "laser-cutter / vinyl-cutter / fiber-craft files",
    terms: [
      "svg", "dxf", "glowforge", "cricut", "laser\\s*cut", "cross\\s*stitch",
      "embroidery", "sewing patterns?", "vector files?", "crochet", "knitting",
      "knit", "beading", "beadwork", "quilt(ing)?\\s*patterns?", "rhinestones?",
    ],
  },
  {
    category: "flat printable/paper images (home-printer, not 3D-printer)",
    terms: [
      "posters?", "wall\\s*art", "art\\s*prints?", "clip\\s*art",
      "coloring\\s*pages?", "coloring\\s*books?", "printable photos?",
      "digital backdrops?", "frame tv art", "classroom decor", "seamless patterns?",
    ],
  },
  {
    category: "party/event paper goods",
    terms: [
      "greeting\\s*cards?", "invitation\\s*templates?", "editable", "invit(e|ation)s?",
      "gift tags?", "favor tags?", "bridal showers?", "welcome signs?", "party signs?",
    ],
  },
  {
    category: "reading material / study content",
    terms: [
      "e-?books?", "biograph(y|ies)", "stud(y|ies)\\s*guides?", "workbooks?",
      "homeschool", "activity books?", "flash\\s*cards?", "\\ba level\\b",
      "(piano\\s*)?sheet music",
    ],
  },
  {
    category: "planners / trackers (not tied to any specific game)",
    terms: ["planners?", "journals?", "savings challenge", "challenge trackers?"],
  },
  {
    category: "product/book covers & branding",
    terms: ["book covers?", "\\blogos?\\b"],
  },
  { category: "apparel/sublimation graphics", terms: ["sublimation"] },
  { category: "digital scrapbooking", terms: ["canva", "digital papers?( packs?)?"] },
  {
    category: "Twitch/OBS streaming-overlay content",
    terms: [
      "twitch", "obs", "streamlabs", "vtuber", "webcam",
      "stream(ing)?\\s*(overlays?|packages?|decorations?|screens?|transitions?|borders?|widgets?)",
      "starting soon screens?",
    ],
  },
  {
    category: "general digital art / photo-editing assets",
    terms: [
      "mockups?", "(procreate|photoshop|ps)\\s*brush(es)?", "brushe?s?:?\\s*(procreate|photoshop)",
      "photoshop overlays?", "photo overlays?", "lightroom presets?", "stock photos?",
    ],
  },
  { category: "device wallpapers", terms: ["(phone|tablet|ipad|desktop)\\s*(wallpaper|background)s?"] },
  { category: "recipes", terms: ["recipes?"] },
  { category: "font files", terms: ["fonts?"] },
  { category: "audio downloads", terms: ["\\bmp3\\b"] },
  {
    category: "spiritual / new-age / divination content",
    terms: [
      "\\bspells?\\b", "\\brituals?\\b", "\\bkarmic\\b", "regression", "past life",
      "divination", "channeling", "psychic reading", "subliminal", "\\bastral\\b",
    ],
  },
  {
    category: "religious (LDS/Bible) education content",
    terms: ["\\blds\\b", "bible stor(y|ies)", "come follow me"],
  },
  {
    category: "digital battlemaps / VTT (virtual tabletop) maps",
    terms: ["battlemaps?", "\\bvtt\\b"],
  },
  {
    category: "apparel screen-printing industry (DTF transfer sheets)",
    terms: ["gang sheets?", "\\bdtf\\b"],
  },
];

/** Compiled once at module load; behaves identically to a single hand-written alternation. */
export const NON_3D_PRINT_PATTERN = new RegExp(
  `\\b(${NON_3D_PRINT_TERM_GROUPS.flatMap((g) => g.terms).join("|")})\\b`,
  "i"
);
