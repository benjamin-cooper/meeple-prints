/**
 * GET /api/products/export
 * Downloads every saved print as a CSV, since ratings/notes/tags now
 * represent real curation work with no other way to get it out of the
 * database (Turso, not a file you can just copy).
 */
import { prisma } from "@/lib/prisma";
import { typeLabel, statusMeta } from "@/lib/constants";

function csvCell(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const products = await prisma.product.findMany({
    orderBy: { title: "asc" },
    include: { games: { select: { name: true } } },
  });

  const header = [
    "Title", "URL", "Games", "Type", "Status", "Price", "Free",
    "Your Rating", "Tags", "Creator", "Notes", "Saved At",
  ];

  const rows = products.map((p) => {
    const tags: string[] = p.tags ? JSON.parse(p.tags) : [];
    return [
      csvCell(p.title),
      csvCell(p.url),
      csvCell(p.games.map((g) => g.name).join("; ")),
      csvCell(typeLabel(p.type)),
      csvCell(statusMeta(p.status).label),
      csvCell(p.isFree ? "" : p.price),
      csvCell(p.isFree ? "Yes" : "No"),
      csvCell(p.rating),
      csvCell(tags.join("; ")),
      csvCell(p.creator),
      csvCell(p.notes),
      csvCell(p.createdAt.toISOString().slice(0, 10)),
    ].join(",");
  });

  const csv = [header.join(","), ...rows].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="meeple-prints-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
