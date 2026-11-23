/**
 * Etsy Open API v3, public listing search. Needs a free API key from a
 * Personal App at https://www.etsy.com/developers (approval usually runs
 * 24-48 hours). This only hits `findAllListingsActive`, which is a public
 * endpoint, so no OAuth/user login is required, just the `x-api-key` header.
 */
import { prisma } from "../prisma";
import { cleanDescription } from "./description";
import { NON_3D_PRINT_PATTERN } from "./non-3d-print-terms";
import type { ProviderCredentials, ProviderResult, SearchProvider } from "./types";

interface EtsyListing {
  listing_id: number;
  title: string;
  url: string;
  price?: { amount?: number; divisor?: number; currency_code?: string };
  /** "physical" | "download" | "both", confirmed against a live response. */
  listing_type?: string;
  num_favorers?: number;
  tags?: string[];
  description?: string;
}

interface EtsyImage {
  url_170x135?: string;
  url_570xN?: string;
}

// findAllListingsActive has no query param to filter by listing_type, so
// this over-fetches and filters client-side. Etsy sells finished physical
// products alongside digital files under the same search, and most tabletop
// hits are the former (someone selling an already-printed insert) -- for a
// query like "dice tower" only about 10% of results are "download", so a
// small fetch mostly comes back empty after filtering. 100 is Etsy's actual
// max for `limit` (confirmed live -- 200 errors with "Value must be <= 100"),
// still a single request, and roughly triples the digital results found.
const FETCH_LIMIT = 100;
const RESULT_LIMIT = 8;

// NON_3D_PRINT_PATTERN itself (the full history of what's excluded and why,
// across seven systematic audits) now lives in ./non-3d-print-terms.ts,
// structured as reviewable groups instead of growing inline here forever.
function isLikely3DPrintFile(listing: EtsyListing): boolean {
  const haystack = `${listing.title} ${(listing.tags ?? []).join(" ")}`;
  return !NON_3D_PRINT_PATTERN.test(haystack);
}

// findAllListingsActive's own `includes` param doesn't actually return
// images despite being documented to (confirmed against a live response --
// no "images" key at all, regardless of "Images"/"images" casing), so each
// surviving listing needs its own call to the separate images endpoint.
// Fetched after the listing_type filter so this is at most RESULT_LIMIT
// calls, not FETCH_LIMIT.
//
// A single failed attempt here (rate limit, timeout, any transient blip)
// used to permanently cache thumbnailUrl: null -- upsert never retries on
// its own, so it'd stay missing until that game happened to get rescanned
// again. Confirmed live: listings showing "No image" in the UI had real,
// fully working image data when queried directly seconds later. One retry
// after a short delay covers the common transient case without adding much
// latency to a search that's already making several of these calls.
//
// The real cause, measured live: Etsy allows 5 requests per second
// (x-limit-per-second: 5). A burst of 8 parallel image calls gets 3 HTTP 429s;
// the same 8 spaced ~150ms apart all succeed. Miscellaneous runs 13 searches
// at once (up to ~100 image calls in a burst), so nearly every new Etsy
// result from that scan came back with no image and the one retry hit the
// same wall. So: every image call now waits for a slot ~4.5 calls/s apart,
// stored thumbnails are reused instead of re-fetched, and a cron step
// (backfillEtsyThumbnails) fills in any that still miss.
const IMAGE_CALL_GAP_MS = 220;
let nextImageSlot = 0;

async function imageSlot(): Promise<void> {
  const now = Date.now();
  const at = Math.max(now, nextImageSlot);
  nextImageSlot = at + IMAGE_CALL_GAP_MS;
  if (at > now) await new Promise((r) => setTimeout(r, at - now));
}

async function fetchThumbnailOnce(listingId: number, apiKey: string): Promise<string | null> {
  await imageSlot();
  const res = await fetch(`https://api.etsy.com/v3/application/listings/${listingId}/images`, {
    headers: { "x-api-key": apiKey },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    console.error(`[etsy] image lookup for listing ${listingId} failed (${res.status})`);
    return null;
  }
  const data = await res.json();
  const image: EtsyImage | undefined = data?.results?.[0];
  return image?.url_570xN ?? image?.url_170x135 ?? null;
}

async function fetchThumbnail(listingId: number, apiKey: string): Promise<string | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 750));
    try {
      const result = await fetchThumbnailOnce(listingId, apiKey);
      if (result) return result;
    } catch {
      // fall through to the retry (or give up, on the second attempt)
    }
  }
  return null;
}

/**
 * Thumbnails already stored for these listing URLs (saved prints and
 * discovered results). Most results in a scan were seen before, so reusing
 * them avoids most image calls -- the thing Etsy rate-limits. A lookup that
 * fails just means every image gets fetched, as before.
 */
async function storedThumbnails(urls: string[]): Promise<Map<string, string>> {
  const known = new Map<string, string>();
  if (urls.length === 0) return known;
  try {
    const where = { url: { in: urls }, thumbnailUrl: { not: null } };
    const select = { url: true, thumbnailUrl: true };
    const [discovered, saved] = await Promise.all([
      prisma.discoveredPrint.findMany({ where, select }),
      prisma.product.findMany({ where, select }),
    ]);
    for (const row of [...discovered, ...saved]) if (row.thumbnailUrl) known.set(row.url, row.thumbnailUrl);
  } catch {
    // fall through with whatever was found
  }
  return known;
}

/**
 * Fills in thumbnails for Etsy results that were stored without one (a
 * rate-limited lookup during a scan). Run from the nightly cron, a few at a
 * time, newest first, spaced out by the same image gate as scans. Returns how
 * many got an image.
 */
export async function backfillEtsyThumbnails(creds: ProviderCredentials, limit = 15): Promise<number> {
  if (!creds.etsyKeystring || !creds.etsySharedSecret) return 0;
  const apiKey = `${creds.etsyKeystring}:${creds.etsySharedSecret}`;
  const missing = await prisma.discoveredPrint.findMany({
    where: { domain: "etsy.com", hidden: false, thumbnailUrl: null },
    orderBy: { firstSeenAt: "desc" },
    select: { url: true },
    distinct: ["url"],
    take: limit,
  });
  let filled = 0;
  for (const { url } of missing) {
    const id = url.match(/\/listing\/(\d+)/)?.[1];
    if (!id) continue;
    const thumbnailUrl = await fetchThumbnail(Number(id), apiKey);
    if (!thumbnailUrl) continue;
    await prisma.discoveredPrint.updateMany({ where: { url, thumbnailUrl: null }, data: { thumbnailUrl } });
    filled++;
  }
  return filled;
}

async function search(query: string, creds: ProviderCredentials): Promise<ProviderResult[]> {
  const params = new URLSearchParams({
    keywords: query,
    limit: String(FETCH_LIMIT),
  });
  // Etsy expects the x-api-key header as "keystring:sharedSecret", not the
  // keystring alone, confirmed against a live 403 response body.
  const apiKey = `${creds.etsyKeystring ?? ""}:${creds.etsySharedSecret ?? ""}`;
  const res = await fetch(`https://api.etsy.com/v3/application/listings/active?${params}`, {
    headers: { "x-api-key": apiKey },
    signal: AbortSignal.timeout(10_000),
  });
  if (res.status === 401 || res.status === 403) {
    throw new Error("Etsy API key was rejected. Check it on the Connect page.");
  }
  if (!res.ok) throw new Error(`Etsy search failed (${res.status})`);

  const data = await res.json();
  const listings: EtsyListing[] = data?.results ?? [];
  const digital = listings
    .filter((listing) => listing.listing_type === "download" && isLikely3DPrintFile(listing))
    .slice(0, RESULT_LIMIT);

  const known = await storedThumbnails(digital.map((listing) => listing.url));

  return Promise.all(
    digital.map(async (listing) => {
      const amount = listing.price?.amount ?? 0;
      const divisor = listing.price?.divisor ?? 100;
      const price = amount / divisor;
      return {
        url: listing.url,
        title: listing.title,
        thumbnailUrl: known.get(listing.url) ?? (await fetchThumbnail(listing.listing_id, apiKey)),
        creator: null,
        price,
        currency: listing.price?.currency_code ?? "USD",
        isFree: price === 0,
        rating: null,
        ratingCount: null,
        likesCount: listing.num_favorers ?? null,
        // Tags are a seller's own category words, often clearer than the
        // keyword-stuffed title; the description follows them.
        description: cleanDescription(
          [listing.tags?.length ? `Tags: ${listing.tags.slice(0, 12).join(", ")}.` : "", listing.description ?? ""].join(" ")
        ),
      };
    })
  );
}

export const etsyProvider: SearchProvider = {
  domain: "etsy.com",
  siteName: "Etsy",
  needsCredentials: true,
  hasCredentials: (creds) => !!creds.etsyKeystring && !!creds.etsySharedSecret,
  search,
};
