/**
 * A pseudo-game for accessories that aren't tied to any specific title --
 * dice towers, meeples, generic organizers. Never a real BGG ID (those are
 * always positive), so it's safe to use as a sentinel without a schema
 * change, and collection-sync.ts explicitly excludes it from drop detection
 * so a BGG sync never flips it out of your collection.
 */
export const MISC_GAME_BGG_ID = -1;
export const MISC_GAME_NAME = "Miscellaneous";

/**
 * A game's search results are flagged "noisy" once enough of what's ever
 * been found for it turns out to be hidden -- the same shape every
 * false-collision game this session found by hand (Sand, Ants, Hibachi:
 * hidden ratio near or at 100%) before a KNOWN_COLLISION_EXCLUSIONS or
 * NON_3D_PRINT_PATTERN rule fixed it. The minimum-discovered floor exists
 * so a brand-new game with 1 hidden result out of 2 total doesn't get
 * flagged on a meaningless sample size.
 */
export const NOISY_GAME_MIN_DISCOVERED = 5;
export const NOISY_GAME_HIDDEN_RATIO = 0.5;

export function isNoisyGame(stats: { total: number; hidden: number } | undefined): boolean {
  if (!stats || stats.total < NOISY_GAME_MIN_DISCOVERED) return false;
  return stats.hidden / stats.total >= NOISY_GAME_HIDDEN_RATIO;
}

export const SITE_LABELS: Record<string, string> = {
  "thingiverse.com": "Thingiverse",
  "printables.com": "Printables",
  "makerworld.com": "MakerWorld",
  "cults3d.com": "Cults3D",
  "myminifactory.com": "MyMiniFactory",
  "etsy.com": "Etsy",
};

export const FREE_BY_DEFAULT_DOMAINS = new Set([
  "thingiverse.com",
  "printables.com",
  "makerworld.com",
  "myminifactory.com",
]);

export const PRODUCT_TYPES = [
  { value: "insert", label: "Insert / Organizer" },
  { value: "tuckbox", label: "Card Box / Tuckbox" },
  { value: "dice-tower", label: "Dice Tower / Dice Tray" },
  { value: "miniature", label: "Miniature / Proxy" },
  { value: "terrain", label: "Terrain" },
  { value: "tokens", label: "Tokens / Resources" },
  { value: "card-holder", label: "Card Holder / Stand" },
  { value: "tracker", label: "Tracker / Dashboard" },
  // A fitted insert replaces the box's own cardboard, organizing everything
  // to the box's exact dimensions. A tray/caddy is usually a standalone
  // piece used during play (a player's component tray) or generic storage
  // not fitted to any particular box -- a real, distinct use case, not a
  // sub-case of "insert".
  { value: "tray", label: "Tray / Caddy" },
  { value: "other", label: "Other" },
] as const;

export const PRODUCT_STATUSES = [
  { value: "wishlist", label: "Saved", swatch: "bg-status-wishlist" },
  { value: "queued", label: "Queued to Print", swatch: "bg-status-queued" },
  { value: "printed", label: "Printed", swatch: "bg-status-printed" },
  { value: "installed", label: "In the Box", swatch: "bg-status-installed" },
] as const;

/**
 * Captured at hide-time so a future audit can query "what got dismissed
 * and why" directly instead of re-deriving intent from titles alone --
 * every collision-exclusion/content-type-filter addition this project has
 * ever shipped started as a human staring at a pile of hidden titles
 * guessing at the pattern.
 */
export const HIDE_REASONS = [
  { value: "wrong-game", label: "Wrong game" },
  { value: "not-3d-print", label: "Not a 3D print" },
  { value: "duplicate", label: "Duplicate" },
  { value: "low-quality", label: "Low quality" },
  { value: "other", label: "Other" },
] as const;

export function hideReasonLabel(value: string | null): string | null {
  return HIDE_REASONS.find((r) => r.value === value)?.label ?? value;
}

export function typeLabel(value: string): string {
  return PRODUCT_TYPES.find((t) => t.value === value)?.label ?? value;
}

export function statusMeta(value: string) {
  return PRODUCT_STATUSES.find((s) => s.value === value) ?? PRODUCT_STATUSES[0];
}
