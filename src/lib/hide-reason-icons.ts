import { Ban, FileX, Copy, ThumbsDown, MoreHorizontal, type LucideIcon } from "lucide-react";

/**
 * One glyph per HIDE_REASONS value, encoding the reason itself rather than
 * decorating an otherwise-plain list -- a dropdown of five identical bullet
 * points reads as a mail-client menu; a mismatched-content icon reads as
 * "this isn't a 3D print" before the label is even parsed.
 */
export const HIDE_REASON_ICONS: Record<string, LucideIcon> = {
  "wrong-game": Ban,
  "not-3d-print": FileX,
  duplicate: Copy,
  "low-quality": ThumbsDown,
  other: MoreHorizontal,
};
