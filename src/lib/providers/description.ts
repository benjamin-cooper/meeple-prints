/**
 * Search APIs hand back a seller's full listing text (HTML on Printables, free
 * text on Etsy and Cults3D). The AI screen (llm-judge.ts) reads a short plain
 * version of it so it can judge what a result really is, not just what its
 * title says -- "Archway Sanctuary" is a shrine for fantasy miniatures, which
 * only the description reveals. It is used at scan time and never stored.
 */
const MAX_LENGTH = 400;

const ENTITIES: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&nbsp;": " " };

export function cleanDescription(raw: string | null | undefined, maxLength = MAX_LENGTH): string | null {
  if (!raw) return null;
  const text = raw
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => ENTITIES[m] ?? m)
    // Seller boilerplate dividers ("_____", "-----", "=====") carry no meaning.
    .replace(/[_=\-~*]{4,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return null;
  return text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}...` : text;
}
