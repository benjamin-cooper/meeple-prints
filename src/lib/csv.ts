/**
 * Minimal RFC4180-ish CSV parser -- just enough to round-trip what
 * /api/products/export actually writes (quoted fields for any value
 * containing a comma, quote, or newline; doubled quotes to escape a
 * literal quote inside one). Not a general-purpose CSV library: no
 * alternate delimiters, no streaming, whole file in memory.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const pushField = () => { row.push(field); field = ""; };
  const pushRow = () => { pushField(); rows.push(row); row = []; };

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      pushField();
    } else if (c === "\n") {
      pushRow();
    } else if (c === "\r") {
      // swallowed; \r\n line endings are handled by the following \n
    } else {
      field += c;
    }
  }
  // Trailing field/row only if the file didn't already end on a newline.
  if (field.length > 0 || row.length > 0) pushRow();

  return rows;
}
