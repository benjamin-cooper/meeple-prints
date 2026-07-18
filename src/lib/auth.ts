/**
 * Site-wide access gate, separate from the BGG API session stored in
 * Settings. Uses Web Crypto (not Node's `crypto` module) so the same
 * signing logic works in both middleware (Edge runtime) and route
 * handlers (Node runtime).
 */
export const SESSION_COOKIE = "meeple_session";
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 365; // 1 year: this is a single-owner tool, so "stay logged in" should mean it
export const SESSION_MAX_AGE_SECONDS = MAX_AGE_MS / 1000;

async function getKey(): Promise<CryptoKey> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set.");
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sign(payload: string): Promise<string> {
  const key = await getKey();
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return toHex(sig);
}

export async function createSessionToken(): Promise<string> {
  const payload = String(Date.now() + MAX_AGE_MS);
  return `${payload}.${await sign(payload)}`;
}

export async function isValidSessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  if (Number(payload) < Date.now()) return false;

  const expected = await sign(payload);
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
}
