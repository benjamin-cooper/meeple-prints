/**
 * Best-effort human title from a print URL's own path, with no network
 * call. Used for bulk GeekList imports, where fetching real Open Graph
 * data for hundreds of links up front would be slow and easy to get
 * rate-limited on. Individual saves still unfurl properly.
 */
export function guessTitleFromUrl(url: string, domain: string): string {
  let path: string;
  try {
    path = new URL(url).pathname;
  } catch {
    return url;
  }

  const segments = path.split("/").filter(Boolean);
  let slug = segments.at(-1) ?? "";

  // thingiverse.com/thing:1234567 has no slug at all
  const thingMatch = slug.match(/^thing:(\d+)$/);
  if (thingMatch) return `Thingiverse thing #${thingMatch[1]}`;

  // printables/makerworld/cults3d/myminifactory: "1234567-some-model-name"
  slug = slug.replace(/^\d+-/, "");
  // etsy: /listing/1234567/some-listing-name (id is its own segment)
  if (domain === "etsy.com" && segments[0] === "listing") {
    slug = segments.at(-1) ?? "";
  }

  slug = slug.replace(/[-_]+/g, " ").trim();
  if (!slug || /^\d+$/.test(slug)) return `${domain} listing`;

  return slug
    .split(" ")
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}
