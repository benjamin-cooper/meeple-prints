/**
 * Decides whether a collection sync's "these games were dropped" result is
 * believable. Games and their saved prints are far easier to lose than to
 * get back, and BGG's collection endpoint can answer 200 with an empty or
 * truncated list (queueing, rate limiting, a session hiccup) that looks
 * identical to "you removed everything".
 *
 * The large-drop bound only applies to the unattended cron path; a manual
 * sync has a person watching it who can recognise a bad result.
 */
export const LARGE_DROP_MIN_GAMES = 10;
export const LARGE_DROP_RATIO = 0.3;

export type DropGuardVerdict = "ok" | "empty-response" | "large-drop";

export function dropGuardVerdict(input: {
  importedCount: number;
  droppedCount: number;
  existingCount: number;
  unattended: boolean;
}): DropGuardVerdict {
  const { importedCount, droppedCount, existingCount, unattended } = input;
  if (droppedCount > 0 && importedCount === 0) return "empty-response";
  if (unattended && existingCount >= LARGE_DROP_MIN_GAMES && droppedCount > existingCount * LARGE_DROP_RATIO) {
    return "large-drop";
  }
  return "ok";
}
