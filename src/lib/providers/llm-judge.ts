/**
 * A second opinion on NEW search results, from Claude Haiku, for the cases
 * hand-written rules can't settle. Every rule in known-collisions.ts is a
 * list of words; a model can read "ICE Board Game 2nd Edition Token Tray" or
 * "Dental Patient Recall Tracker" and tell they aren't for the game that was
 * searched. It only ever sees results the catalog has never stored, and:
 *
 *  - fails open: no API key, a timeout, a bad response -> everything is kept;
 *  - leans keep: the prompt says to keep whenever unsure;
 *  - never deletes: a rejected result is stored as a hidden row labelled
 *    "auto:..." (see scan.ts), so it shows up on the Hidden page for review
 *    and unhiding, and the hidden row stops it being re-judged every scan.
 */
import { ETSY_SIGNAL_REQUIRED_GAMES } from "./known-collisions";
import { MISC_GAME_NAME } from "../constants";

export type JudgeVerdict = "keep" | "different-game" | "off-topic";
export interface JudgeCandidate {
  url: string;
  title: string;
  domain: string;
}

const API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-haiku-4-5-20251001";
const CHUNK_SIZE = 40;
const TIMEOUT_MS = 5_000;

/**
 * Which games get the second opinion. Default: every game. LLM_JUDGE_SCOPE=noisy
 * narrows it to Miscellaneous plus the games already known to be mostly Etsy
 * noise; =off disables it.
 */
export function shouldJudge(gameName: string, scope: string | undefined = process.env.LLM_JUDGE_SCOPE): boolean {
  if (scope === "off") return false;
  if (scope === "noisy") return gameName === MISC_GAME_NAME || ETSY_SIGNAL_REQUIRED_GAMES.has(gameName);
  return true;
}

function decodeEntities(text: string): string {
  return text.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

export function buildPrompt(gameName: string, candidates: JudgeCandidate[]): { system: string; user: string } {
  const isMisc = gameName === MISC_GAME_NAME;
  const intro =
    "You screen search results for a personal catalog of 3D-printable accessories (inserts, organizers, trays, tokens, " +
    "miniatures, terrain, card holders, trackers, dice towers) for board games. Results come from keyword searches on " +
    "3D-printing sites and Etsy, so many are unrelated things that merely share a word with the search term.\n" +
    "Use your general knowledge of board games, video games, miniatures lines, franchises and products: if a title names a " +
    "specific game or product you recognise (e.g. ICE, Zombicide, Middle-Earth Strategy Battle Game, a Freebox router), " +
    "judge it as being for THAT thing, not for a game that merely shares a word with it.\n\n";

  const rules = isMisc
    ? "This is the owner's \"Miscellaneous\" shelf: generic accessories NOT tied to any single game (dice towers, dice trays, " +
      "meeples, card holders, dungeon-master screens, generic token trays and organizers, Wyrmwood gaming furniture). " +
      "The owner only wants accessories for games they own, so anything made for one specific named game is not wanted here.\n" +
      "Verdicts:\n" +
      "- keep: a generic tabletop/board-game accessory, OR you are unsure.\n" +
      "- different-game: made for one specific named game, franchise or product (e.g. an insert for Catan, a Zombicide organizer, a print-and-play game).\n" +
      "- off-topic: clearly not a tabletop/board-game accessory at all (planner, spreadsheet, ebook, art print, wallpaper, template, software, jewelry, craft pattern, spiritual download, other hobby).\n"
    : `The owner owns the board game "${gameName}".\n` +
      "Verdicts:\n" +
      `- keep: plausibly a 3D-printable accessory for "${gameName}", or a generic board-game accessory not tied to another game, OR you are unsure.\n` +
      "- different-game: clearly made for a different, specific game, franchise or product (another board game, a video game, a toy line, a vehicle, a router...) that only shares a word with the name.\n" +
      "- off-topic: clearly not a 3D-printable board-game accessory at all (planner, spreadsheet, ebook, art print, wallpaper, template, software, jewelry, craft pattern, spiritual download, other hobby).\n";

  const system =
    intro + rules + "\nWhen in doubt, answer keep: wrongly hiding a real result is worse than showing a bad one.\n" +
    'Reply with ONLY a JSON array, one entry per numbered result, like [{"i":1,"v":"keep"},{"i":2,"v":"off-topic"}].';

  const user = candidates.map((c, i) => `${i + 1}. [${c.domain}] ${decodeEntities(c.title)}`).join("\n");
  return { system, user };
}

/** Anything unparseable, missing, or unrecognised is "keep" -- the safe answer. */
export function parseVerdicts(text: string, count: number): JudgeVerdict[] {
  const verdicts: JudgeVerdict[] = Array(count).fill("keep");
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end <= start) return verdicts;
  try {
    const parsed: unknown = JSON.parse(text.slice(start, end + 1));
    if (!Array.isArray(parsed)) return verdicts;
    for (const entry of parsed) {
      const e = entry as { i?: unknown; v?: unknown };
      const index = typeof e.i === "number" ? e.i - 1 : -1;
      if (index >= 0 && index < count && (e.v === "different-game" || e.v === "off-topic")) verdicts[index] = e.v;
    }
  } catch {
    // fall through with the all-keep default
  }
  return verdicts;
}

interface JudgeOptions {
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

/** Map of url -> verdict for the results to reject; kept results are absent. */
export async function judgeResults(
  gameName: string,
  candidates: JudgeCandidate[],
  options: JudgeOptions = {}
): Promise<Map<string, Exclude<JudgeVerdict, "keep">>> {
  const rejected = new Map<string, Exclude<JudgeVerdict, "keep">>();
  const apiKey = options.apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey || candidates.length === 0) return rejected;

  const doFetch = options.fetchImpl ?? fetch;
  for (let offset = 0; offset < candidates.length; offset += CHUNK_SIZE) {
    const chunk = candidates.slice(offset, offset + CHUNK_SIZE);
    const { system, user } = buildPrompt(gameName, chunk);
    try {
      const res = await doFetch(API_URL, {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: options.model ?? process.env.JUDGE_MODEL ?? DEFAULT_MODEL,
          max_tokens: 40 + chunk.length * 16,
          temperature: 0,
          system,
          messages: [{ role: "user", content: user }],
        }),
        signal: AbortSignal.timeout(options.timeoutMs ?? TIMEOUT_MS),
      });
      if (!res.ok) {
        console.error(`[judge] ${gameName}: API ${res.status}`);
        continue;
      }
      const data = (await res.json()) as { content?: { type: string; text?: string }[] };
      const text = data.content?.find((b) => b.type === "text")?.text ?? "";
      parseVerdicts(text, chunk.length).forEach((verdict, i) => {
        if (verdict !== "keep") rejected.set(chunk[i].url, verdict);
      });
    } catch (err) {
      console.error(`[judge] ${gameName}: ${err instanceof Error ? err.message : err}`);
    }
  }
  return rejected;
}
