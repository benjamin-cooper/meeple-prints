/**
 * Makers commonly cross-post the same physical model to two or three sites
 * with a near-identical (sometimes slightly reworded) title. Detects those
 * cross-domain duplicates by title similarity and keeps only the
 * best-reviewed copy. Shared by the live search pipeline
 * (searchAllProviders) and the one-off cleanup script for prints already
 * cached before this existed.
 *
 * Same-domain pairs are skipped by default -- for a single-maker upload
 * site (Printables, Thingiverse, Cults3D, MyMiniFactory) two listings on
 * the same domain are never the same duplicate-across-sites problem this
 * file exists for. Etsy is the one exception: it's a multi-seller
 * marketplace where the same seller has been observed (2026-08-13)
 * relisting the identical product twice under separate listing IDs (a
 * language-variant split, see LANGUAGE_VARIANT_CLAUSE below). Etsy pairs
 * are only compared when their URLs differ, never when they're the exact
 * same listing -- scan.ts's dedupeAgainstExisting depends on a cached row
 * never colliding with its own refresh (same URL) on a later scan; without
 * the URL guard, a listing whose likesCount ticked up since last scan could
 * "win" against its own stale cached copy, get the stale copy hidden, and
 * then have the upsert silently leave it hidden too (the upsert's `data`
 * doesn't touch `hidden`). Same-domain matching for every other site stays
 * off entirely -- this isn't a general marketplace behavior, just this one
 * observed Etsy pattern.
 */
export interface Dedupable {
  title: string;
  domain: string;
  url: string;
  ratingCount: number | null;
  likesCount: number | null;
}

// Deliberately high. Auditing real data at 0.7 showed genuinely different
// product variants scoring 0.67-0.80 on plain bag-of-words overlap -- e.g.
// "Ark Nova Insert" vs "Ark Nova Deluxe Insert" (different edition, not
// interchangeable) and "Bitoku Game Organizer WITH EXPANSION" vs "...(no
// expansion)" (literally opposite variants; "no"/"with" barely move the
// token-overlap score). A missed true duplicate just leaves an extra card
// in the grid; a wrongly-hidden distinct edition actively hides the one
// listing someone needs. Bias hard toward precision.
const SIMILARITY_THRESHOLD = 0.85;

// "without" is just the other common way makers phrase "no" ("no
// expansion" / "without expansion" mean the same thing) -- confirmed live,
// "Bitoku Game Organizer (no expansion)" vs "...(without expansion)" only
// scored 0.67 and slipped past the threshold as two different listings.
// Deliberately narrow: this does NOT touch "with", so the exact case this
// file's own threshold comment warns about ("Bitoku Game Organizer WITH
// EXPANSION" vs "...(no expansion)" -- genuinely opposite variants) is
// unaffected and still correctly scores low.
//
// "insert" and "organizer" are used as pure synonyms throughout this
// entire corpus -- unlike "Deluxe"/"Retail"/"2nd Edition", which are real,
// non-interchangeable edition differences, "Insert" and "Organizer" never
// distinguish two different physical products in practice, only which
// word a given site/creator happened to prefer for the exact same category
// of thing. Auditing the near-miss band (0.5-0.849 Jaccard, after the
// included-clause fix above) found this as the single largest remaining
// pattern: "Lost Ruins of Arnak Organizer" / "...insert organizer", "River
// of Gold Insert" / "...organizer / insert", several more, all genuine
// duplicates sitting at 0.80-0.83 purely because of this one word.
// Confirmed this doesn't reopen the file's own documented false-merge
// risk: "Ark Nova Insert" vs "Ark Nova Deluxe Insert" still scores 0.75
// with this synonym in place, since "Deluxe" (the actual differentiator)
// is untouched.
const SYNONYMS: Record<string, string> = { without: "no", insert: "organizer" };

// A trailing "inc./incl./including ..." clause almost always just lists
// bonus bundled content on top of the same base listing ("Captain Flip
// Insert/Organizer inc. Case W0lf cointray, Super Rookie Tileframes...",
// "Civolution (incl. expansion) - Organizer") -- confirmed live, both
// scored well under threshold (0.35-0.5) against the plain version of the
// same listing purely because of how many extra words that clause adds,
// not because it's a different product. Deliberately scoped to "inc./
// incl./including" specifically rather than a general "shorter title is a
// subset of the longer one" rule -- a subset check would also wrongly
// merge this file's own "Ark Nova Insert" vs "Ark Nova Deluxe Insert"
// counter-example ({ark,nova,insert} is a literal subset of {ark,nova,
// deluxe,insert}), since "Deluxe" isn't introduced by an inclusion-marker
// word and is a real, non-interchangeable edition difference. Checked:
// this strips the parenthetical form and the bare trailing-clause form
// without touching "Deluxe" at all -- that pair still scores 0.75, still
// correctly under threshold.
const PARENTHETICAL_INCLUDED_CLAUSE = /\s*\((incl?\.?|including)\b[^)]*\)/gi;
const BARE_TRAILING_INCLUDED_CLAUSE = /\s+(incl?\.?|including)\b.*$/i;

// A specific Etsy seller pattern found live (2026-08-13): the same
// board-game organizer listed as two separate listings, differing only in
// a "(deutsch)"/"(englisch)" marker for which language the included PDF
// instructions are written in ("Darwin's Journey...Bauplan (deutsch)..."
// vs "...Bauplan (englisch)..."), same price both times. The underlying
// printable file is the same product; only the instruction-sheet language
// differs, which this app has no use for distinguishing. Deliberately
// narrow to the exact forms observed rather than a general language list --
// no evidence yet of this pattern using any other language pair.
const LANGUAGE_VARIANT_CLAUSE = /\s*\((deutsch|englisch|english|german)\)/gi;

// The bare (non-parenthetical) trailing form strips everything from the
// marker to the end of the string, which is only safe if a type word
// already appears *before* it -- otherwise the marker could be the only
// thing separating the game name from the one word that says what kind of
// product this even is. Confirmed live: "Clank! Catacombs inc Lairs
// Expansion Insert" would otherwise lose "Insert" itself (it comes after
// "inc", not before) and wrongly match an equally bare, type-less "Clank!
// Catacombs" listing of unverified type -- a real false-merge risk, not a
// hypothetical one. The parenthetical form doesn't need this guard: a
// self-contained bracketed aside never removes the main clause's own words.
const TYPE_WORD = /\b(insert|organi[sz]er|tray|box|holder|caddy|dividers?|stand|rack|case|tower)\b/i;

function stripIncludedClause(title: string): string {
  const normalized = title.replace(PARENTHETICAL_INCLUDED_CLAUSE, "");
  const trailingMatch = normalized.match(BARE_TRAILING_INCLUDED_CLAUSE);
  if (trailingMatch?.index != null && TYPE_WORD.test(normalized.slice(0, trailingMatch.index))) {
    return normalized.slice(0, trailingMatch.index);
  }
  return normalized;
}

function tokenize(title: string): Set<string> {
  return new Set(
    stripIncludedClause(title)
      .replace(LANGUAGE_VARIANT_CLAUSE, "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean)
      .map((t) => SYNONYMS[t] ?? t)
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  const intersection = [...a].filter((t) => b.has(t)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Reviews beat likes regardless of raw count -- a real rating ("if
 * possible") outranks a larger like count, since it's a stronger signal
 * that someone actually printed and used the thing. Only falls back to
 * comparing likes when neither candidate has a rating.
 */
function engagementRank(item: Dedupable): [number, number] {
  if (item.ratingCount != null) return [2, item.ratingCount];
  if (item.likesCount != null) return [1, item.likesCount];
  return [0, 0];
}

function beats(a: Dedupable, b: Dedupable): boolean {
  const [tierA, countA] = engagementRank(a);
  const [tierB, countB] = engagementRank(b);
  return tierA !== tierB ? tierA > tierB : countA > countB;
}

/** Indices of items to drop, keeping the best-ranked item in each cross-domain duplicate cluster. */
export function findDuplicateIndices<T extends Dedupable>(items: T[]): Set<number> {
  const tokenSets = items.map((i) => tokenize(i.title));
  const toDrop = new Set<number>();

  for (let i = 0; i < items.length; i++) {
    if (toDrop.has(i)) continue;
    for (let j = i + 1; j < items.length; j++) {
      if (toDrop.has(j)) continue;
      if (items[i].domain === items[j].domain) {
        const bothEtsy = items[i].domain === "etsy.com";
        const sameListing = items[i].url === items[j].url;
        if (!bothEtsy || sameListing) continue;
      }
      if (jaccard(tokenSets[i], tokenSets[j]) < SIMILARITY_THRESHOLD) continue;

      const loserIsI = beats(items[j], items[i]);
      toDrop.add(loserIsI ? i : j);
      if (loserIsI) break;
    }
  }

  return toDrop;
}
