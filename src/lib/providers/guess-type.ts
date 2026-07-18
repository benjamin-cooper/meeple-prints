/**
 * None of the search providers return a category that maps to our own
 * insert/organizer/tokens taxonomy, so this guesses one from the title's
 * own wording. Good enough to filter a results grid, not meant to be
 * authoritative. The saved product's type is always editable afterward.
 */
const RULES: Array<{ type: string; pattern: RegExp }> = [
  { type: "dice-tower", pattern: /dice\s*(tower|tray)/i },
  { type: "tuckbox", pattern: /tuck\s*box|card\s*box/i },
  { type: "card-holder", pattern: /card\s*(holder|stand|tray)/i },
  { type: "tracker", pattern: /\btracker\b|\bdashboard\b|score\s*wheel/i },
  { type: "insert", pattern: /\binsert\b|organi[sz]er/i },
  { type: "tokens", pattern: /\bcoins?\b|\btokens?\b|\bmeeples?\b|\bresources?\b/i },
  { type: "terrain", pattern: /\bterrain\b/i },
  { type: "miniature", pattern: /\bminiatures?\b|\bminis?\b|\bproxy\b|\bproxies\b/i },
];

export function guessTypeFromTitle(title: string): string {
  for (const rule of RULES) {
    if (rule.pattern.test(title)) return rule.type;
  }
  return "other";
}
