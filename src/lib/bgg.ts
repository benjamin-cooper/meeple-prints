/**
 * BoardGameGeek XML API v2 client.
 *
 * BGG's XML API v2 requires session authentication (since early 2026).
 * The caller logs in with a BGG username+password, which returns the
 * cookie jar that must be sent with every subsequent request. BGG also
 * appears to rotate the session cookie on use, so every response is
 * re-scanned for a fresh Set-Cookie and the merged jar is threaded through
 * (and handed back to the caller) instead of resending the original
 * login cookie forever.
 *
 * The GeekList endpoint (`/xmlapi2/geeklist/...`) is deliberately not
 * used here: BGG rejects it with "Unauthorized" for every client,
 * including a real logged-in browser session, so it isn't a client-side
 * bug to work around. The community 3D-print GeekList is still linked
 * to directly for manual browsing (see lib/search-links.ts).
 *
 * Docs: https://boardgamegeek.com/wiki/page/BGG_XML_API2
 */

import { parseStringPromise } from "xml2js";

const BGG_API = "https://boardgamegeek.com/xmlapi2";
const BGG_LOGIN_API = "https://boardgamegeek.com/login/api/v1";

// ── Types ──────────────────────────────────────────────────────────────────

export interface BggCollectionGame {
  bggId: number;
  name: string;
  yearPublished?: number;
  thumbnail?: string;
  image?: string;
}

// ── Authentication ─────────────────────────────────────────────────────────

/**
 * Merges any Set-Cookie headers on a response into an existing cookie jar
 * string, overwriting cookies by name and leaving the rest untouched.
 * `Headers.get("set-cookie")` only reliably surfaces a single header, so
 * this reads every line via `getSetCookie()`.
 */
function mergeCookieJar(existingJar: string, res: Response): string {
  const setCookies = res.headers.getSetCookie?.() ?? [];
  if (setCookies.length === 0) return existingJar;

  const jar = new Map<string, string>();
  for (const pair of existingJar.split(";").map((s) => s.trim()).filter(Boolean)) {
    const eq = pair.indexOf("=");
    if (eq > 0) jar.set(pair.slice(0, eq), pair.slice(eq + 1));
  }
  for (const setCookie of setCookies) {
    const pair = setCookie.split(";")[0].trim();
    const eq = pair.indexOf("=");
    if (eq > 0) jar.set(pair.slice(0, eq), pair.slice(eq + 1));
  }
  return Array.from(jar.entries()).map(([k, v]) => `${k}=${v}`).join("; ");
}

/** Log in to BGG and return the full session cookie jar. Throws if credentials are invalid. */
export async function bggLogin(username: string, password: string): Promise<string> {
  const res = await fetch(BGG_LOGIN_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    },
    body: JSON.stringify({ credentials: { username, password } }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = (body as { errors?: { message?: string } })?.errors?.message
      ?? `Login failed (${res.status})`;
    throw new Error(msg);
  }

  const cookieJar = mergeCookieJar("", res);
  if (!cookieJar.includes("SessionID=")) throw new Error("No session cookie returned from BGG login");
  return cookieJar;
}

// ── Fetch helpers ──────────────────────────────────────────────────────────

interface BggXmlResult {
  xml: string;
  cookieJar: string;
}

async function fetchBggXml(url: string, cookieJar: string, retries = 5): Promise<BggXmlResult> {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Cookie": cookieJar,
      },
      cache: "no-store",
    });

    // 202 = BGG is queueing the request (common for /collection); retry
    if (res.status === 202) {
      await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
      continue;
    }

    if (res.status === 401) {
      throw new Error("Your BGG session expired. Reconnect your account and try again.");
    }

    if (!res.ok) throw new Error(`BGG API ${res.status}: ${await res.text()}`);
    return { xml: await res.text(), cookieJar: mergeCookieJar(cookieJar, res) };
  }
  throw new Error("BGG API timed out after retries");
}

function getText(node: unknown): string {
  const arr = node as Array<{ _?: string } | string> | undefined;
  if (!arr?.length) return "";
  const first = arr[0];
  return typeof first === "string" ? first : first._ ?? "";
}

// ── Collection ─────────────────────────────────────────────────────────────

/**
 * Fetch the full owned collection (base games only) for a BGG username.
 * Returns the (possibly rotated) cookie jar alongside the games so the
 * caller can persist it for the next request.
 */
export async function getBggCollection(
  bggUsername: string,
  cookieJar: string
): Promise<{ games: BggCollectionGame[]; cookieJar: string }> {
  const url = `${BGG_API}/collection?username=${encodeURIComponent(bggUsername)}&own=1&excludesubtype=boardgameexpansion`;
  const { xml, cookieJar: nextJar } = await fetchBggXml(url, cookieJar);
  const parsed = await parseStringPromise(xml, { explicitArray: true });

  const items: unknown[] = parsed?.items?.item ?? [];
  const games = items
    .map((item: unknown) => {
      const i = item as {
        $?: { objectid?: string };
        name?: Array<{ _?: string } | string>;
        yearpublished?: Array<{ _?: string } | string>;
        thumbnail?: Array<{ _?: string } | string>;
        image?: Array<{ _?: string } | string>;
      };
      const yearStr = getText(i.yearpublished);
      return {
        bggId: parseInt(i.$?.objectid ?? "0"),
        name: getText(i.name) || "Unknown",
        yearPublished: yearStr ? parseInt(yearStr) || undefined : undefined,
        thumbnail: getText(i.thumbnail) || undefined,
        image: getText(i.image) || undefined,
      };
    })
    .filter((g) => g.bggId > 0);

  return { games, cookieJar: nextJar };
}

// ── Utilities ──────────────────────────────────────────────────────────────

/** Parse a BGG game ID from a URL or plain number. */
export function parseBggId(input: string): number | null {
  const trimmed = input.trim();
  if (/^\d+$/.test(trimmed)) return parseInt(trimmed) || null;
  const m = trimmed.match(/boardgamegeek\.com\/boardgame\/(\d+)/i);
  return m ? parseInt(m[1]) : null;
}
