/**
 * Isolated connectivity check for one search provider, no database
 * involved. Useful for confirming a new API key actually works (or
 * seeing the exact rejection reason) without running a full scan.
 *
 * Usage:
 *   npx tsx scripts/test-provider.ts etsy "insert"
 *   npx tsx scripts/test-provider.ts printables "Wingspan"
 *
 * Matches on a substring of the provider's domain (etsy, thingiverse,
 * cults3d, printables).
 */
import "dotenv/config";
import { SEARCH_PROVIDERS } from "../src/lib/providers";
import { getProviderCredentials } from "../src/lib/providers/env-credentials";

async function main() {
  const [providerArg, ...queryParts] = process.argv.slice(2);
  const query = queryParts.join(" ") || "insert";

  if (!providerArg) {
    console.error("Usage: npx tsx scripts/test-provider.ts <provider> [query]");
    console.error(`Providers: ${SEARCH_PROVIDERS.map((p) => p.domain).join(", ")}`);
    process.exit(1);
  }

  const provider = SEARCH_PROVIDERS.find((p) => p.domain.includes(providerArg.toLowerCase()));
  if (!provider) {
    console.error(`No provider matching "${providerArg}". Options: ${SEARCH_PROVIDERS.map((p) => p.domain).join(", ")}`);
    process.exit(1);
  }

  const creds = getProviderCredentials();
  if (provider.needsCredentials && !provider.hasCredentials(creds)) {
    console.error(`${provider.siteName} has no credentials configured in .env.`);
    process.exit(1);
  }

  console.log(`Searching ${provider.siteName} for "${query}"...\n`);
  try {
    const results = await provider.search(query, creds);
    console.log(`${results.length} result(s):\n`);
    for (const r of results) {
      console.log(`- ${r.title}\n  ${r.url}${r.rating ? ` | ${r.rating}★ (${r.ratingCount})` : ""}${r.likesCount ? ` | ${r.likesCount} likes` : ""}`);
    }
  } catch (err) {
    console.error("Search failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
