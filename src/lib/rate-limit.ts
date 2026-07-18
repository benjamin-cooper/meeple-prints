/**
 * Best-effort in-memory rate limiter. On serverless hosting this resets on
 * every cold start and isn't shared across instances, so it won't stop a
 * determined distributed attacker, but it meaningfully slows down the
 * common case (a script hammering one endpoint) without adding an external
 * dependency, and BGG's own login still backstops the real brute-force risk.
 */
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

export function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  entry.count++;
  return entry.count > MAX_ATTEMPTS;
}
