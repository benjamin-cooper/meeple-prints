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
 * Docs: https://boardgamegeek.com/wiki/page/BGG_XML_API2
 */

import { parseStringPromise } from "xml2js";

const BGG_API = "https://boardgamegeek.com/xmlapi2";
const BGG_LOGIN_API = "https://boardgamegeek.com/login/api/v1";

// The community-maintained "3D Prints for Board Games" GeekList.
// https://boardgamegeek.com/geeklist/186909/3d-prints-for-board-games
export const PRINTS_GEEKLIST_ID = 186909;

// ── Types ──────────────────────────────────────────────────────────────────

export interface BggCollectionGame {
  bggId: number;
  name: string;
  yearPublished?: number;
  thumbnail?: string;
  image?: string;
}

export interface GeeklistLink {
  url: string;
  domain: string;
}

export interface GeeklistItem {
  itemId: string;
  bggId: number | null; // BGG game id this entry is attached to, if any
  gameName: string | null;
  username: string;
  postdate: string;
  links: GeeklistLink[];
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
      const body = await res.text().catch(() => "");
      // A 401 here almost always means the session expired, but BGG has
      // also been seen to return it for other rejections (e.g. an
      // endpoint-specific restriction). Surface what it actually said
      // instead of assuming, so a wrong diagnosis doesn't send someone
      // in circles reconnecting an account that isn't the problem.
      const detail = body.trim() ? ` (${body.trim().slice(0, 200)})` : "";
      throw new Error(`Your BGG session expired. Reconnect your account and try again.${detail}`);
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

// ── GeekList (community 3D-print index) ─────────────────────────────────────

const KNOWN_PRINT_DOMAINS = [
  "thingiverse.com",
  "printables.com",
  "makerworld.com",
  "cults3d.com",
  "myminifactory.com",
  "etsy.com",
];

const IMAGE_EXT_RE = /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i;

function extractLinks(body: string): GeeklistLink[] {
  const urlRe = /https?:\/\/[^\s\]"'<>)]+/g;
  const matches = body.match(urlRe) ?? [];
  const seen = new Set<string>();
  const links: GeeklistLink[] = [];

  for (const raw of matches) {
    const url = raw.replace(/[.,;:]+$/, "");
    if (IMAGE_EXT_RE.test(url)) continue;
    if (url.includes("boardgamegeek.com")) continue;
    if (seen.has(url)) continue;

    let domain: string;
    try {
      domain = new URL(url).hostname.replace(/^www\./, "");
    } catch {
      continue;
    }

    const known = KNOWN_PRINT_DOMAINS.find((d) => domain === d || domain.endsWith(`.${d}`));
    if (!known) continue;

    seen.add(url);
    links.push({ url, domain: known });
  }
  return links;
}

async function fetchGeeklistPage(
  geeklistId: number,
  page: number,
  cookieJar: string
): Promise<{ items: GeeklistItem[]; cookieJar: string }> {
  const url = `${BGG_API}/geeklist/${geeklistId}?comments=1&page=${page}`;
  const { xml, cookieJar: nextJar } = await fetchBggXml(url, cookieJar);
  const parsed = await parseStringPromise(xml, { explicitArray: true });

  const rawItems: unknown[] = parsed?.geeklist?.item ?? [];
  const items = rawItems.map((item: unknown) => {
    const i = item as {
      $?: { id?: string; objectid?: string; objectname?: string; username?: string; postdate?: string };
      body?: Array<{ _?: string } | string>;
    };
    const objectId = i.$?.objectid ? parseInt(i.$.objectid) : NaN;
    return {
      itemId: i.$?.id ?? "",
      bggId: !isNaN(objectId) && objectId > 0 ? objectId : null,
      gameName: i.$?.objectname ?? null,
      username: i.$?.username ?? "",
      postdate: i.$?.postdate ?? "",
      links: extractLinks(getText(i.body)),
    };
  });

  return { items, cookieJar: nextJar };
}

/**
 * Fetch every item of a GeekList. The API doesn't document a stable page
 * size, so this pages until a request contributes no new item ids.
 * That's safe whether or not `page` is actually honored server-side.
 * Each page's request uses whatever cookie jar the previous page's
 * response returned, in case BGG rotates the session on use.
 */
export async function getGeeklistItems(
  geeklistId: number,
  cookieJar: string,
  onProgress?: (itemsSoFar: number, page: number) => void
): Promise<{ items: GeeklistItem[]; cookieJar: string }> {
  const byId = new Map<string, GeeklistItem>();
  const MAX_PAGES = 60;
  let currentJar = cookieJar;

  for (let page = 1; page <= MAX_PAGES; page++) {
    const result = await fetchGeeklistPage(geeklistId, page, currentJar);
    currentJar = result.cookieJar;
    if (result.items.length === 0) break;

    let newCount = 0;
    for (const item of result.items) {
      if (!item.itemId || byId.has(item.itemId)) continue;
      byId.set(item.itemId, item);
      newCount++;
    }

    onProgress?.(byId.size, page);
    if (newCount === 0) break;

    await new Promise((r) => setTimeout(r, 250));
  }

  return { items: Array.from(byId.values()), cookieJar: currentJar };
}

// ── Utilities ──────────────────────────────────────────────────────────────

/** Parse a BGG game ID from a URL or plain number. */
export function parseBggId(input: string): number | null {
  const trimmed = input.trim();
  if (/^\d+$/.test(trimmed)) return parseInt(trimmed) || null;
  const m = trimmed.match(/boardgamegeek\.com\/boardgame\/(\d+)/i);
  return m ? parseInt(m[1]) : null;
}
