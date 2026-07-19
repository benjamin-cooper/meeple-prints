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
  images?: Array<{ url_170x135?: string; url_570xN?: string }>;
}

async function search(query: string, creds: ProviderCredentials): Promise<ProviderResult[]> {
  const params = new URLSearchParams({
    keywords: query,
    limit: "8",
    includes: "Images",
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

  return listings.map((listing) => {
    const amount = listing.price?.amount ?? 0;
    const divisor = listing.price?.divisor ?? 100;
    const price = amount / divisor;
    return {
      url: listing.url,
      title: listing.title,
      thumbnailUrl: listing.images?.[0]?.url_570xN ?? listing.images?.[0]?.url_170x135 ?? null,
      creator: null,
      price,
      currency: listing.price?.currency_code ?? "USD",
      isFree: price === 0,
      rating: null,
      ratingCount: null,
      likesCount: null,
    };
  });
}

export const etsyProvider: SearchProvider = {
  domain: "etsy.com",
  siteName: "Etsy",
  needsCredentials: true,
  hasCredentials: (creds) => !!creds.etsyKeystring && !!creds.etsySharedSecret,
  search,
};
