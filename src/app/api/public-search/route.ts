/**
 * POST /api/public-search
 * Body: { query: string }
 * Public, no session required (see PUBLIC_PATHS in src/proxy.ts) -- a
 * general lookup across every configured provider, not tied to any game
 * record or the owner's collection. No database writes: no Game needed, no
 * DiscoveredPrint caching, no alreadySaved annotation.
 */
import { searchAllProviders } from "@/lib/providers";
import { getProviderCredentials } from "@/lib/providers/env-credentials";
import { isRateLimited } from "@/lib/rate-limit";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(`public-search:${ip}`)) {
    return Response.json({ error: "Too many searches. Try again later." }, { status: 429 });
  }

  const { query } = await request.json();
  if (!query || typeof query !== "string" || !query.trim()) {
    return Response.json({ error: "A search query is required." }, { status: 400 });
  }

  const outcomes = await searchAllProviders(query.trim(), getProviderCredentials());
  return Response.json({ providers: outcomes });
}
