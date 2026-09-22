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
      // "cut files?" added in the thirteenth audit -- "laser\s*cut" only
      // matches when the seller actually writes "laser cut"; "(digital cut
      // file)" (no "laser") is the same vinyl/laser-cutter file type phrased
      // differently. Verified against every currently-visible row -- only
      // the two genuine cut-file listings it was added for.
      "cut files?",
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
      // "worksheets?" added in the fourteenth audit -- therapy/counseling
      // and classroom worksheet content, same shape as the study-guide/
      // workbook terms already here. Verified against every currently-
      // visible row -- zero false positives.
      "worksheets?",
      // "escape room" promoted here in the sixteenth audit -- was Iliad-
      // only (see known-collisions.ts's history), but a second, unrelated
      // game (The Game Makers) just hit the same printable-puzzle-activity
      // genre, so it's general Etsy content rather than one game's
      // collision. Verified against every currently-visible row.
      "escape rooms?",
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
  {
    // "shirt design"/"t-shirt" and the tumbler/cup-wrap terms added in the
    // fourteenth audit -- both are recurring Etsy sublimation-craft genres
    // (shirt graphics, sublimation tumbler/can wraps) that happened to
    // match a game's name in passing. Verified against every currently-
    // visible row -- zero false positives.
    category: "apparel/sublimation graphics",
    terms: ["sublimation", "shirt designs?", "t-?shirts?", "tumblers?", "cup wraps?", "can wraps?"],
  },
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
      // Bare "png" added in the fourteenth audit -- a real STL/3D-print
      // seller says "STL"/"3MF"/"3D print files", never the raster image
      // format a flat digital-art listing ships as. Verified against every
      // currently-visible row across every game -- zero false positives.
      "\\bpng\\b",
    ],
  },
  { category: "device wallpapers", terms: ["(phone|tablet|ipad|watch|desktop)\\s*(wallpaper|background)s?"] },
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
    // Broadened in the twelfth audit -- the original LDS-specific terms
    // only caught a fraction of this. "Covenant" alone had 13 hidden rows
    // of mainstream (non-LDS) Christian content -- Bible verse art,
    // Sunday school crafts, scripture cards, baptism activities -- spread
    // widely enough across other unrelated games (Sanctuary, Earth, Recall,
    // Falling, ...) that this belongs here as a general category rather
    // than a per-game collision list. Verified against every currently-
    // visible row across every game -- zero false positives even on the
    // bare "jesus"/"bible"/"christian"/"prayer" terms.
    category: "religious (Christian/LDS) education and craft content",
    terms: [
      "\\blds\\b", "come follow me", "\\bbible\\b", "\\bjesus\\b", "\\bchristian\\b", "\\bprayer\\b",
      "\\bscripture", "sunday school", "devotional", "\\bbaptism", "communion", "\\bgospel\\b", "\\bpsalm",
      "abrahamic covenant",
      // "young women" added in the fourteenth audit -- the actual name of
      // the LDS youth program ("Young Women's lesson"), same LDS-specific
      // shape as "come follow me" above.
      "young women",
    ],
  },
  {
    category: "digital battlemaps / VTT (virtual tabletop) maps",
    terms: ["battlemaps?", "\\bvtt\\b"],
  },
  {
    category: "apparel screen-printing industry (DTF transfer sheets)",
    terms: ["gang sheets?", "\\bdtf\\b"],
  },
  // Added in the tenth audit -- unlike the earlier groups, this one is
  // board-game-adjacent, not a random word collision: real sellers list
  // genuine flat paper/PDF accessories (log books, score trackers, printable
  // playmats, campaign map bundles) for the same games this app is
  // otherwise finding real 3D-printed inserts for. relevance.ts's title
  // match has no way to tell "printable STL insert" from "printable PDF
  // scorecard" -- both mention the game by name and both say "printable."
  // Verified against every currently-visible Etsy row (2026-08-15): each
  // term here only ever matched genuine paper content, never a real STL/3D
  // listing that happened to mention a mat or map in passing.
  {
    category: "board-game paper accessories (not 3D-printed)",
    terms: [
      "log ?books?", "score ?sheets?", "score ?cards?", "score ?trackers?", "track maps?", "player mats?", "playmats?",
      // "summary sheet" added in the eleventh audit -- a Ticket to Ride
      // seller lists one per map expansion ("Ticket to Ride - [6a] France
      // || Summary Sheet"), 21 separate listings, same paper-not-3D-print
      // shape as the rest of this group. Verified against every currently-
      // visible row across every game -- zero false positives.
      "summary sheets?",
      // "rule refresher" added in the thirteenth audit -- one seller runs
      // the exact same templated listing ("<GAME> <All In> Board Game,
      // Summary Guide, Rule Refresher, Player Aid") across at least 7
      // unrelated games. None of the 7 mention STL/3D print/insert/
      // organizer anywhere -- a flat printable reference sheet, not a
      // physical product. Verified against every currently-visible row --
      // catches exactly those 7, nothing else.
      "rule refreshers?",
      // Bare "pdf" added by explicit request (2026-09-07) -- a blanket
      // rule, not a verified-safe one like the rest of this file: this
      // deliberately also excludes the 3 Darwin's Journey/Sleeping Gods
      // Etsy listings confirmed genuine earlier (real 3D-print organizer
      // files that just happen to bundle a PDF instruction sheet). Both
      // games already have other real STL sources on other domains, so the
      // user chose "no PDFs at all" over keeping those two alternate
      // listings.
      "\\bpdf\\b",
    ],
  },
];

/** Compiled once at module load; behaves identically to a single hand-written alternation. */
export const NON_3D_PRINT_PATTERN = new RegExp(
  `\\b(${NON_3D_PRINT_TERM_GROUPS.flatMap((g) => g.terms).join("|")})\\b`,
  "i"
);
