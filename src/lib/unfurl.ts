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

export async function unfurlUrl(rawUrl: string): Promise<UnfurledLink> {
  const url = new URL(rawUrl);
  const domain = url.hostname.replace(/^www\./, "");

  const res = await fetch(rawUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      "Accept": "text/html",
    },
    signal: AbortSignal.timeout(10_000),
  });

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
