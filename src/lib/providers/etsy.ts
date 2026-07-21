/**
 * Etsy Open API v3, public listing search. Needs a free API key from a
 * Personal App at https://www.etsy.com/developers (approval usually runs
 * 24-48 hours). This only hits `findAllListingsActive`, which is a public
 * endpoint, so no OAuth/user login is required, just the `x-api-key` header.
 */
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

// listing_type: "download" just means "buying this gets you a file," not
// that the file is an STL -- Etsy's digital tabletop-accessory listings are
// a mix of 3D-print files and laser-cutter/vinyl-cutter/sewing files (SVG,
// DXF, cross-stitch, embroidery). There's no clean structured signal for
// this: file_data on the full listing detail is a vague string like "1 TXT",
// and getting it needs a third API call per listing on top of search and
// images. Same category of accepted-imperfect heuristic as
// src/lib/providers/relevance.ts: exclude on a strong title/tag signal for
// a different file format, same known gap (a listing that mentions "laser
// cut" only in passing, e.g. bundled with a real STL, could still be wrongly
// excluded).
const NON_3D_PRINT_PATTERN = /\b(svg|dxf|glowforge|cricut|laser\s*cut|cross\s*stitch|embroidery|sewing pattern|vector file)\b/i;

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
async function fetchThumbnail(listingId: number, apiKey: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.etsy.com/v3/application/listings/${listingId}/images`, {
      headers: { "x-api-key": apiKey },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const image: EtsyImage | undefined = data?.results?.[0];
    return image?.url_570xN ?? image?.url_170x135 ?? null;
  } catch {
    return null;
  }
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

  return Promise.all(
    digital.map(async (listing) => {
      const amount = listing.price?.amount ?? 0;
      const divisor = listing.price?.divisor ?? 100;
      const price = amount / divisor;
      return {
        url: listing.url,
        title: listing.title,
        thumbnailUrl: await fetchThumbnail(listing.listing_id, apiKey),
        creator: null,
        price,
        currency: listing.price?.currency_code ?? "USD",
        isFree: price === 0,
        rating: null,
        ratingCount: null,
        likesCount: listing.num_favorers ?? null,
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
