/**
 * Provider search endpoints do their own fuzzy, OR-style token matching, so
 * a query like "Slay the Spire: The Board Game" can return a completely
 * unrelated "Connect 4 - Board game" purely on the generic words "board"
 * and "game". This strips generic filler before comparing, then requires
 * every remaining distinctive word of the game name to appear in the
 * result's title.
 *
 * Known gap: a short, generic game name (e.g. "Covenant") can still match a
 * result that happens to use that same common word in an unrelated sense.
 * No word-presence heuristic can tell those apart without real semantic
 * matching, which is out of scope here.
 */
const GENERIC_WORDS = new Set([
  "a", "an", "the", "of", "and", "or", "for", "with",
  "board", "game", "games", "card", "cards",
  "edition", "deluxe", "second", "expansion", "revised",
  "collector's", "collectors", "anniversary", "core",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export function isRelevant(gameName: string, resultTitle: string): boolean {
  const gameTokens = tokenize(gameName);
  const titleTokens = new Set(tokenize(resultTitle));

  const coreTokens = gameTokens.filter((t) => !GENERIC_WORDS.has(t));
  const requiredTokens = coreTokens.length > 0 ? coreTokens : gameTokens;
  if (requiredTokens.length === 0) return true;

  return requiredTokens.every((t) => titleTokens.has(t));
}
