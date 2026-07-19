/**
 * Official Thingiverse API. Needs a free app token from
 * https://www.thingiverse.com/apps/create, sent as a Bearer token.
 * Endpoint confirmed against the current OpenAPI spec at
 * thingiverse.com/swagger/docs/openapi.yaml.
 */
import type { ProviderCredentials, ProviderResult, SearchProvider } from "./types";

interface ThingiverseHit {
  id: number;
  name: string;
  thumbnail?: string;
  public_url?: string;
  creator?: { name?: string };
  like_count?: number;
}

async function search(query: string, creds: ProviderCredentials): Promise<ProviderResult[]> {
  const url = `https://api.thingiverse.com/search/${encodeURIComponent(query)}/?type=things&per_page=8&sort=relevant`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${creds.thingiverseToken}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (res.status === 401) throw new Error("Thingiverse app token was rejected. Check it on the Connect page.");
  if (!res.ok) throw new Error(`Thingiverse search failed (${res.status})`);

  const data = await res.json();
  const hits: ThingiverseHit[] = data?.hits ?? [];

  return hits.map((hit) => ({
    url: hit.public_url ?? `https://www.thingiverse.com/thing:${hit.id}`,
    title: hit.name,
    thumbnailUrl: hit.thumbnail || null,
    creator: hit.creator?.name ?? null,
    price: null,
    currency: null,
    isFree: true,
    rating: null,
    ratingCount: null,
    likesCount: hit.like_count ?? null,
  }));
}

export const thingiverseProvider: SearchProvider = {
  domain: "thingiverse.com",
  siteName: "Thingiverse",
  needsCredentials: true,
  hasCredentials: (creds) => !!creds.thingiverseToken,
  search,
};
