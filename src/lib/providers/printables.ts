/**
 * Printables has no official public API, but its own frontend calls an
 * unauthenticated GraphQL endpoint for search. Confirmed working directly
 * against api.printables.com; no key needed, but it's an internal API
 * Printables could change without notice.
 */
import type { ProviderResult, SearchProvider } from "./types";

const ENDPOINT = "https://api.printables.com/graphql/";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const QUERY = `
  query SearchModels($query: String!, $limit: Int, $ordering: SearchChoicesEnum) {
    result: searchPrints2(query: $query, printType: print, limit: $limit, ordering: $ordering) {
      items { id name slug user { publicUsername } image { filePath } }
    }
  }
`;

interface PrintablesItem {
  id: string;
  name: string;
  slug: string;
  user?: { publicUsername?: string };
  image?: { filePath?: string };
}

async function search(query: string): Promise<ProviderResult[]> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": UA },
    body: JSON.stringify({
      operationName: "SearchModels",
      query: QUERY,
      variables: { query, limit: 8, ordering: "best_match" },
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Printables search failed (${res.status})`);

  const data = await res.json();
  const items: PrintablesItem[] = data?.data?.result?.items ?? [];

  return items.map((item) => ({
    url: `https://www.printables.com/model/${item.id}-${item.slug}`,
    title: item.name,
    thumbnailUrl: item.image?.filePath ? `https://media.printables.com/${item.image.filePath}` : null,
    creator: item.user?.publicUsername ?? null,
    price: null,
    currency: null,
    isFree: true,
  }));
}

export const printablesProvider: SearchProvider = {
  domain: "printables.com",
  siteName: "Printables",
  needsCredentials: false,
  hasCredentials: () => true,
  search,
};
