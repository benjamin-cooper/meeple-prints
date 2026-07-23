/**
 * None of the search providers return a category that maps to our own
 * insert/organizer/tokens taxonomy, so this guesses one from the title's
 * own wording. Good enough to filter a results grid, not meant to be
 * authoritative. The saved product's type is always editable afterward.
 */
// Order matters: each rule only ever catches what fell through everything
// above it, so broadening a later rule (insert's tray/storage/caddy) can't
// steal a title a more specific earlier rule (dice-tower, card-holder)
// would've caught -- e.g. "dice tray" still hits dice-tower first even
// though insert's pattern would also match "tray".
const RULES: Array<{ type: string; pattern: RegExp }> = [
  // "holder"/"case"/"vault" added alongside tower/tray -- audited a large
  // sample of real "other"-typed results and found e.g. "D20 Dice Holder"
  // and "Dragon Dice Holder" landing in "other" purely because they don't
  // say "tower" or "tray", despite being the same accessory.
  { type: "dice-tower", pattern: /dice\s*(tower|tray|holder|case|vault)/i },
  { type: "tuckbox", pattern: /tuck\s*box|card\s*box/i },
  { type: "card-holder", pattern: /card\s*(holder|stand|tray)/i },
  // "overlay" added -- player board overlays (e.g. "Terraforming Mars
  // Player Board Overlay") do the same job as a tracker/dashboard, just a
  // different physical form (a sheet that sits on the board vs. a standalone piece).
  { type: "tracker", pattern: /\btracker\b|\bdashboard\b|score\s*wheel|\boverlay\b/i },
  // "insert"/"inlay"/"organizer" checked here, ahead of tokens/terrain/
  // miniature -- these are the maker's own explicit word for what the
  // *whole* product is, a stronger signal than a word describing one
  // feature within it. Confirmed live: "Grand Austria Hotel Insert /
  // Organizer - Holds Meeple Source..." self-labels as an insert, but also
  // says "meeple" -- checking tokens first would wrongly steal it.
  { type: "insert", pattern: /\binsert\b|\binlay\b|organi[sz]er/i },
  // Checked *before* the generic tray/storage catch-all further down --
  // "tray"/"storage"/"caddy" are generic enough to describe a token holder
  // just as often as a box insert ("7 Wonders Duel Token Tray", "On Mars:
  // Player Token Storage Caddy"). Confirmed live: putting the generic
  // catch-all first wrongly reclassified 14 real "tokens" results as
  // "insert" purely on the strength of "tray" alone.
  { type: "tokens", pattern: /\bcoins?\b|\btokens?\b|\bmeeples?\b|\bresources?\b/i },
  { type: "terrain", pattern: /\bterrain\b/i },
  { type: "miniature", pattern: /\bminiatures?\b|\bminis?\b|\bproxy\b|\bproxies\b/i },
  // Last resort before "other" -- generic tray/storage words with no
  // stronger signal (no "insert"/"organizer", no token/coin/meeple/
  // resource, no terrain, no miniature) elsewhere in the title. Deliberately
  // its own "tray" type, not folded into "insert": a fitted insert replaces
  // the box's own cardboard to its exact dimensions, while a tray/caddy is
  // usually a standalone piece used during play or generic storage not
  // fitted to any particular box -- a real, distinct use case someone would
  // want to filter for separately. The single biggest gap found auditing
  // "other": tile trays, card storage, board storage that don't say
  // "insert"/"organizer" and don't belong to any of the other categories.
  { type: "tray", pattern: /\btray\b|\bcaddy\b|\bstorage\b|\benclosure\b/i },
];

export function guessTypeFromTitle(title: string): string {
  for (const rule of RULES) {
    if (rule.pattern.test(title)) return rule.type;
  }
  return "other";
}
