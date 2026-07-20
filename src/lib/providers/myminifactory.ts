/**
 * Official MyMiniFactory API. Needs a free API key created at
 * https://www.myminifactory.com/settings/developer/application, sent as
 * the `key` query param. Confirmed against the OpenAPI spec at
 * github.com/MyMiniFactory/api-documentation -- GET /search accepts either
 * OAuth2 or a bare API key, and their own API guidelines explicitly allow
 * browsing/searching without a logged-in user (only downloading an object
 * requires that), so this is within what they intend third-party apps to do.
 */
import type { ProviderCredentials, ProviderResult, SearchProvider } from "./types";

interface MyMiniFactoryHit {
  id: number;
  name: string;
  url?: string;
  images?: { thumbnail?: string }[];
  designer?: { name?: string; username?: string };
  likes?: number;
}

async function search(query: string, creds: ProviderCredentials): Promise<ProviderResult[]> {
  const url = `https://www.myminifactory.com/api/v2/search?q=${encodeURIComponent(query)}&per_page=8&key=${creds.myminifactoryApiKey}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (res.status === 401 || res.status === 403) throw new Error("MyMiniFactory API key was rejected. Check it on the Connect page.");
  if (!res.ok) throw new Error(`MyMiniFactory search failed (${res.status})`);

  const data = await res.json();
  const hits: MyMiniFactoryHit[] = data?.items ?? [];

  return hits.map((hit) => ({
    url: hit.url ?? `https://www.myminifactory.com/object/${hit.id}`,
    title: hit.name,
    thumbnailUrl: hit.images?.[0]?.thumbnail || null,
    creator: hit.designer?.name ?? hit.designer?.username ?? null,
    // A minority of objects are sold through MMF's separate "store" license
    // system, but the search response has no single flat price field for
    // it -- same simplifying assumption src/lib/constants.ts's
    // FREE_BY_DEFAULT_DOMAINS already makes for this domain elsewhere.
    price: null,
    currency: null,
    isFree: true,
    rating: null,
    ratingCount: null,
    likesCount: hit.likes ?? null,
  }));
}

export const myminifactoryProvider: SearchProvider = {
  domain: "myminifactory.com",
  siteName: "MyMiniFactory",
  needsCredentials: true,
  hasCredentials: (creds) => !!creds.myminifactoryApiKey,
  search,
};
