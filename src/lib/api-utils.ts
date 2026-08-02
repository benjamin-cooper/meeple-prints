import type { NextRequest } from "next/server";

/**
 * request.json() throws on a malformed or empty body, which every route
 * calling it directly left uncaught -- Next.js turns that into its generic
 * 500 HTML error page instead of the clean 400 JSON error every other
 * validation failure in these routes returns. Centralizes the catch so
 * every route gets consistent behavior instead of relying on each one to
 * remember to wrap it.
 */
export async function parseJsonBody<T = Record<string, unknown>>(request: NextRequest): Promise<T | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
