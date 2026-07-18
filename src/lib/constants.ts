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
  { value: "insert", label: "Insert / organizer" },
  { value: "tuckbox", label: "Tuckbox / card box" },
  { value: "dice-tower", label: "Dice tower / tray" },
  { value: "miniature", label: "Miniature / proxy" },
  { value: "terrain", label: "Terrain" },
  { value: "tokens", label: "Tokens / resources" },
  { value: "card-holder", label: "Card holder / stand" },
  { value: "tracker", label: "Tracker / dashboard" },
  { value: "other", label: "Other" },
] as const;

export const PRODUCT_STATUSES = [
  { value: "wishlist", label: "Saved", swatch: "bg-status-wishlist" },
  { value: "queued", label: "Queued to print", swatch: "bg-status-queued" },
  { value: "printed", label: "Printed", swatch: "bg-status-printed" },
  { value: "installed", label: "In the box", swatch: "bg-status-installed" },
] as const;

export function typeLabel(value: string): string {
  return PRODUCT_TYPES.find((t) => t.value === value)?.label ?? value;
}

export function statusMeta(value: string) {
  return PRODUCT_STATUSES.find((s) => s.value === value) ?? PRODUCT_STATUSES[0];
}
