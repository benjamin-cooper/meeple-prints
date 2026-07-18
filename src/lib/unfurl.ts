/**
 * Generic link unfurling: given any product/model page URL, fetch it and
 * pull Open Graph / meta tags so a saved print can be auto-titled and
 * thumbnailed without needing a per-site API integration (most of these
 * sites (Thingiverse, Cults3D, Etsy) gate real search APIs behind app
 * review, so paste-a-link is the reliable path).
 */

import { SITE_LABELS, FREE_BY_DEFAULT_DOMAINS } from "@/lib/constants";

export interface UnfurledLink {
  url: string;
  domain: string;
  siteName: string;
  title: string | null;
  description: string | null;
  thumbnailUrl: string | null;
  isFreeDefault: boolean;
}

function extractMeta(html: string, keys: string[]): string | null {
  for (const key of keys) {
    const re = new RegExp(
      `<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']*)["']`,
      "i"
    );
    const altRe = new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${key}["']`,
      "i"
    );
    const match = html.match(re) ?? html.match(altRe);
    if (match?.[1]) return decodeHtmlEntities(match[1]);
  }
  return null;
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

/**
 * Blocks the obvious SSRF targets: loopback, link-local (which is where
 * cloud metadata endpoints like 169.254.169.254 live), and private ranges.
 * This checks the literal hostname/IP only, not where a domain's DNS
 * actually resolves, so it isn't a defense against DNS rebinding, just
 * against someone directly pasting an internal address or a redirect to
 * one.
 */
function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local") || host === "::1") return true;

  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    if (a === 127 || a === 10 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
  }
  return false;
}

export async function unfurlUrl(rawUrl: string): Promise<UnfurledLink> {
  const url = new URL(rawUrl);
  const domain = url.hostname.replace(/^www\./, "");
  if (isBlockedHost(url.hostname)) throw new Error("That host isn't allowed.");

  const res = await fetch(rawUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      "Accept": "text/html",
    },
    signal: AbortSignal.timeout(10_000),
  });

  // Re-check post-redirect: fetch() follows redirects by default, so the
  // final destination could differ from the URL that was validated above.
  if (isBlockedHost(new URL(res.url).hostname)) throw new Error("That host isn't allowed.");

  if (!res.ok) throw new Error(`Couldn't load that page (${res.status})`);
  const html = await res.text();

  const title =
    extractMeta(html, ["og:title", "twitter:title"]) ??
    (html.match(/<title>([^<]*)<\/title>/i)?.[1] ? decodeHtmlEntities(html.match(/<title>([^<]*)<\/title>/i)![1]) : null);
  const description = extractMeta(html, ["og:description", "twitter:description", "description"]);
  const thumbnailUrl = extractMeta(html, ["og:image", "twitter:image"]);
  const ogSiteName = extractMeta(html, ["og:site_name"]);

  return {
    url: rawUrl,
    domain,
    siteName: SITE_LABELS[domain] ?? ogSiteName ?? domain,
    title,
    description,
    thumbnailUrl,
    isFreeDefault: FREE_BY_DEFAULT_DOMAINS.has(domain),
  };
}
