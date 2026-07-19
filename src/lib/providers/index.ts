import { printablesProvider } from "./printables";
import { thingiverseProvider } from "./thingiverse";
import { cults3dProvider } from "./cults3d";
import { etsyProvider } from "./etsy";
import { isRelevant } from "./relevance";
import { findDuplicateIndices } from "./dedupe";
import type { ProviderCredentials, ProviderOutcome, SearchProvider } from "./types";

export type { ProviderCredentials, ProviderOutcome, ProviderResult, SearchProvider } from "./types";
export { UNSUPPORTED_SITES } from "./unsupported-sites";

export const SEARCH_PROVIDERS: SearchProvider[] = [
  printablesProvider,
  thingiverseProvider,
  cults3dProvider,
  etsyProvider,
];

export async function searchAllProviders(
  query: string,
  creds: ProviderCredentials
): Promise<ProviderOutcome[]> {
  const outcomes = await Promise.all(
    SEARCH_PROVIDERS.map(async (provider): Promise<ProviderOutcome> => {
      const hasCredentials = provider.hasCredentials(creds);
      const base = {
        domain: provider.domain,
        siteName: provider.siteName,
        needsCredentials: provider.needsCredentials,
        hasCredentials,
      };
      if (provider.needsCredentials && !hasCredentials) {
        return { ...base, results: [], error: null };
      }
      try {
        const results = await provider.search(query, creds);
        const relevant = results.filter((r) => isRelevant(query, r.title));
        return { ...base, results: relevant, error: null };
      } catch (err) {
        return { ...base, results: [], error: err instanceof Error ? err.message : String(err) };
      }
    })
  );

  // Makers commonly cross-post the same model to two or three sites, so
  // dedupe across every provider's results together, not just within one.
  const flat = outcomes.flatMap((o, outcomeIndex) =>
    o.results.map((r, resultIndex) => ({ ...r, domain: o.domain, outcomeIndex, resultIndex }))
  );
  const toDrop = findDuplicateIndices(flat.map((r) => ({ title: r.title, domain: r.domain, ratingCount: r.ratingCount, likesCount: r.likesCount })));
  const droppedKeys = new Set(
    [...toDrop].map((i) => `${flat[i].outcomeIndex}:${flat[i].resultIndex}`)
  );

  return outcomes.map((o, outcomeIndex) => ({
    ...o,
    results: o.results.filter((_, resultIndex) => !droppedKeys.has(`${outcomeIndex}:${resultIndex}`)),
  }));
}
