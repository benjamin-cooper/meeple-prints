"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { parseCsv } from "@/lib/csv";
import { PRODUCT_TYPES, PRODUCT_STATUSES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { GameSummary, Product } from "@/lib/types";

/** Column order this reads, matching /api/products/export's own header exactly. */
const EXPECTED_HEADER = [
  "Title", "URL", "Games", "Type", "Status", "Price", "Free",
  "Your Rating", "Tags", "Creator", "Notes", "Saved At",
];

interface ParsedRow {
  line: number;
  title: string;
  url: string;
  gameNames: string[];
  type: string;
  status: string;
  price: string;
  isFree: string;
  rating: string;
  tags: string;
  creator: string;
  notes: string;
}

interface PlannedRow extends ParsedRow {
  gameIds: number[];
  unmatchedGames: string[];
  skipReason: string | null;
}

const typeByLabel = new Map(PRODUCT_TYPES.map((t) => [t.label.toLowerCase(), t.value]));
const statusByLabel = new Map(PRODUCT_STATUSES.map((s) => [s.label.toLowerCase(), s.value]));

function planRow(row: ParsedRow, games: GameSummary[]): PlannedRow {
  const gameByName = new Map(games.map((g) => [g.name.toLowerCase(), g.id]));
  const gameIds: number[] = [];
  const unmatchedGames: string[] = [];
  for (const name of row.gameNames) {
    const id = gameByName.get(name.toLowerCase());
    if (id !== undefined) gameIds.push(id); else if (name) unmatchedGames.push(name);
  }

  let skipReason: string | null = null;
  if (!row.title.trim()) skipReason = "no title";
  else if (!row.url.trim()) skipReason = "no URL";
  else if (gameIds.length === 0) skipReason = row.gameNames.length ? "no matching game" : "no game listed";

  return { ...row, gameIds, unmatchedGames, skipReason };
}

export function ImportDialog({
  open,
  onOpenChange,
  games,
  onImported,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  games: GameSummary[];
  onImported: (product: Product) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<PlannedRow[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const handleFile = async (file: File) => {
    setFileName(file.name);
    const text = await file.text();
    const table = parseCsv(text).filter((r) => r.some((cell) => cell.trim() !== ""));
    if (table.length === 0) {
      toast.error("That file is empty.");
      return;
    }
    const [header, ...dataRows] = table;
    if (EXPECTED_HEADER.some((col, i) => header[i]?.trim() !== col)) {
      toast.error(`Doesn't look like a Meeple Prints export -- expected columns starting with "${EXPECTED_HEADER.slice(0, 3).join(", ")}".`);
      return;
    }

    const parsed = dataRows.map((cells, i): ParsedRow => ({
      line: i + 2, // +1 for the header row, +1 for 1-indexing
      title: cells[0] ?? "",
      url: cells[1] ?? "",
      gameNames: (cells[2] ?? "").split(";").map((s) => s.trim()).filter(Boolean),
      type: typeByLabel.get((cells[3] ?? "").toLowerCase()) ?? "other",
      status: statusByLabel.get((cells[4] ?? "").toLowerCase()) ?? "wishlist",
      price: cells[5] ?? "",
      isFree: cells[6] ?? "",
      rating: cells[7] ?? "",
      tags: cells[8] ?? "",
      creator: cells[9] ?? "",
      notes: cells[10] ?? "",
    }));

    setRows(parsed.map((r) => planRow(r, games)));
  };

  const importable = rows?.filter((r) => !r.skipReason) ?? [];
  const skipped = rows?.filter((r) => r.skipReason) ?? [];

  const handleImport = async () => {
    if (importable.length === 0) return;
    setImporting(true);
    try {
      const results = await Promise.allSettled(
        importable.map((row) =>
          fetch("/api/products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              url: row.url.trim(),
              title: row.title.trim(),
              domain: new URL(row.url.trim()).hostname.replace(/^www\./, ""),
              type: row.type,
              status: row.status,
              price: row.price.trim() === "" ? null : Number(row.price),
              isFree: row.isFree.trim().toLowerCase() === "yes",
              rating: row.rating.trim() === "" ? null : Number(row.rating),
              tags: row.tags.trim() ? row.tags.split(";").map((t) => t.trim()).filter(Boolean) : undefined,
              creator: row.creator.trim() || undefined,
              notes: row.notes.trim() || undefined,
              gameIds: row.gameIds,
            }),
          }).then(async (res) => {
            if (!res.ok) throw new Error();
            return (await res.json()) as Product;
          })
        )
      );
      const succeeded = results.filter((r): r is PromiseFulfilledResult<Product> => r.status === "fulfilled");
      succeeded.forEach((r) => onImported(r.value));
      toast.success(`Imported ${succeeded.length} of ${importable.length} print${importable.length === 1 ? "" : "s"}.`);
      handleClose();
    } catch {
      toast.error("Import failed partway through.");
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setRows(null);
    setFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(o) : handleClose())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import prints</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Reads a CSV in the same format Catalog&apos;s own Export produces -- matches games by name against
            your current collection, and upserts by URL, so re-importing a file you&apos;ve already loaded just
            links any new games instead of duplicating anything.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files?.[0];
              if (file) handleFile(file);
            }}
            className={cn(
              "w-full flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed py-6 text-sm transition-colors",
              dragOver
                ? "border-primary bg-primary/10 text-foreground"
                : fileName
                  ? "border-primary/40 bg-primary/5 text-foreground"
                  : "border-border bed-grid text-muted-foreground hover:border-primary/40 hover:text-foreground"
            )}
          >
            <Upload className="size-5" />
            <span className="font-mono text-xs uppercase tracking-wide">{fileName || "Drop a CSV here, or click to choose"}</span>
          </button>

          {rows !== null && (
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-medium text-status-printed">{importable.length}</span> ready to import
                {skipped.length > 0 && (
                  <>, <span className="font-medium text-destructive">{skipped.length}</span> skipped</>
                )}
                .
              </p>
              {skipped.length > 0 && (
                <div className="max-h-32 overflow-y-auto rounded-md border border-border p-2 space-y-1">
                  {skipped.map((r) => (
                    <p key={r.line} className="text-xs text-muted-foreground">
                      Line {r.line} ({r.title || r.url || "blank row"}): {r.skipReason}
                      {r.unmatchedGames.length > 0 && ` -- "${r.unmatchedGames.join('", "')}" not in your collection`}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleImport} disabled={importable.length === 0 || importing}>
            {importing ? "Importing…" : `Import ${importable.length || ""}`.trim()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
