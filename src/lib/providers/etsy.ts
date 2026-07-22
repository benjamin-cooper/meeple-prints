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
// a mix of 3D-print files, laser-cutter/vinyl-cutter/sewing/fiber-craft
// files (SVG, DXF, cross-stitch, embroidery, crochet/knitting patterns),
// flat printable images (posters, wall art, game-room decor meant for a
// home/paper printer, not a 3D printer), plain reading material (ebooks,
// study guides, journals, book covers), sublimation/apparel graphics, and
// editable Canva party templates (invitations, birthday signage). There's
// no clean structured signal for this: file_data on the full listing detail
// is a vague string like "1 TXT", and getting it needs a third API call per
// listing on top of search and images. Same category of accepted-imperfect
// heuristic as src/lib/providers/relevance.ts: exclude on a strong
// title/tag signal for a different content type, same known gap (a listing
// that mentions "poster" only in passing, e.g. a bundle that includes both
// an STL and a poster, could still be wrongly excluded).
//
// Most of these terms exist specifically for games whose name is also an
// ordinary English word, a real historical figure, or an event/party theme
// ("Speakeasy", "Galileo Galilei", "Recall", "Hibachi", "Emberleaf") --
// relevance.ts's title-word-match step has no way to know the game isn't
// what a listing is actually about, so Etsy's own unrelated ebooks, baby
// shower invitations, and crochet patterns pass it cleanly on name alone.
// Systematic audit of the full hidden-print set (2026-07-21) confirmed this
// as a real recurring pattern, not a one-off: multiple "Hibachi"-game
// listings were actually hibachi-dinner birthday invitations, an
// "Emberleaf"-game listing was a crochet scarf pattern, etc.
//
// This can only ever catch a *content-type* mismatch, not a *subject*
// mismatch -- a listing can be a completely genuine, well-made 3D-print
// file and still be wrong for the game, if the game's name is also a real
// object/place/profession (a real "Galileo Galilei" pendulum clock STL, a
// real "Luthier" guitar headstock template, real "Lisboa" city-name decor).
// Tried requiring a positive tabletop-signal word (dice/miniature/board
// game/etc) as a second layer for these games specifically, same mechanism
// as misc-terms.ts's hasTabletopSignal() -- rejected after checking it
// against live data: it would have cut the large majority of these games'
// genuinely correct results too (e.g. nearly every real "Speakeasy" or
// "Quacks of Quedlinburg" insert/token-tray listing, since those titles
// just name the game and the part, never the words "board game" or
// "tabletop"). No title-only heuristic can fix that gap without deleting
// more real results than fake ones; hiding stays the right tool for it.
const NON_3D_PRINT_PATTERN =
  /\b(svg|dxf|glowforge|cricut|laser\s*cut|cross\s*stitch|embroidery|sewing pattern|vector file|poster|wall\s*art|art\s*print|clip\s*art|coloring\s*page|greeting\s*card|invitation\s*template|e-?books?|biography|stud(y|ies)\s*guide|workbook|homeschool|activity book|planner|journal|book cover|editable|invit(e|ation)s?|sublimation|crochet|knitting|knit|beading|beadwork|canva|digital paper pack)\b/i;

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
async function fetchThumbnailOnce(listingId: number, apiKey: string): Promise<string | null> {
  const res = await fetch(`https://api.etsy.com/v3/application/listings/${listingId}/images`, {
    headers: { "x-api-key": apiKey },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return null;
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
