/**
 * Official Cults3D GraphQL API. Needs a free read-only API key from
 * https://cults3d.com/en/api/keys, paired with your Cults handle for
 * HTTP Basic auth. Query shape confirmed against the community-maintained
 * docs at github.com/CheekyCodexConjurer/cults3d-api-docs.
 */
import { cleanDescription } from "./description";
import type { ProviderCredentials, ProviderResult, SearchProvider } from "./types";

const ENDPOINT = "https://cults3d.com/graphql";

const buildQuery = (withDescription: boolean) => `
  query Search($query: String!, $limit: Int) {
    creationsSearchBatch(query: $query, limit: $limit) {
      results {
        name(locale: EN)
        url(locale: EN)
        ${withDescription ? "description(locale: EN)" : ""}
        illustrationImageUrl
        price(currency: USD) { value }
        creator { nick }
        likesCount
      }
    }
  }
`;

interface CultsResult {
  name: string;
  description?: string | null;
  url: string;
  illustrationImageUrl?: string;
  price?: { value?: number } | null;
  creator?: { nick?: string };
  likesCount?: number | null;
}

// illustrationImageUrl is usually a static image, but for creations whose
// main preview is an animated turntable, Cults3D returns a video file
// (.mp4) at that same field instead -- confirmed live, ~2% of results.
// An <img> tag can't render video, so passing it through just silently
// shows nothing; falling back to null renders the honest "No image" state.
function isImageUrl(url: string | undefined): url is string {
  return !!url && !/\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);
}

async function search(query: string, creds: ProviderCredentials): Promise<ProviderResult[]> {
  const authHeader = "Basic " + Buffer.from(`${creds.cultsUsername}:${creds.cultsApiKey}`).toString("base64");

  const run = async (withDescription: boolean) => {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({ query: buildQuery(withDescription), variables: { query, limit: 8 } }),
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status === 401) throw new Error("Cults3D login was rejected. Check your username and API key on the Connect page.");
    return res;
  };

  // The description field is only there for the AI screen. If this API ever
  // rejects it (a schema change, a field I couldn't test without a key), fall
  // back to the plain query so search itself never breaks over it.
  let res = await run(true);
  let data = res.ok ? await res.json() : null;
  if (!res.ok || data?.errors?.length) {
    res = await run(false);
    if (!res.ok) throw new Error(`Cults3D search failed (${res.status})`);
    data = await res.json();
  }
  if (data.errors?.length) throw new Error(data.errors[0]?.message ?? "Cults3D search failed.");

  const results: CultsResult[] = data?.data?.creationsSearchBatch?.results ?? [];

  return results.map((r) => {
    const price = r.price?.value ?? null;
    return {
      url: r.url,
      title: r.name,
      thumbnailUrl: isImageUrl(r.illustrationImageUrl) ? r.illustrationImageUrl! : null,
      creator: r.creator?.nick ?? null,
      price: price && price > 0 ? price : null,
      currency: price && price > 0 ? "USD" : null,
      isFree: !price || price === 0,
      rating: null,
      ratingCount: null,
      likesCount: r.likesCount ?? null,
      description: cleanDescription(r.description),
    };
  });
}

export const cults3dProvider: SearchProvider = {
  domain: "cults3d.com",
  siteName: "Cults3D",
  needsCredentials: true,
  hasCredentials: (creds) => !!creds.cultsUsername && !!creds.cultsApiKey,
  search,
};
