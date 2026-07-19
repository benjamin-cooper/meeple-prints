"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Search, Plus, LayoutGrid, Rows3, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { ProductCard } from "@/components/product-card";
import { ProductRow } from "@/components/product-row";
import { ProductDialog } from "@/components/product-dialog";
import { DiscoveredPrintCard } from "@/components/discovered-print-card";
import { PRODUCT_TYPES, PRODUCT_STATUSES, SITE_LABELS } from "@/lib/constants";
import type { CatalogItem, Game, GameSummary, Product } from "@/lib/types";
import { cn } from "@/lib/utils";

type ViewMode = "marketplace" | "spreadsheet";
type SortMode = "newest" | "title" | "price-low" | "price-high";
type GameWithScan = Game & { lastScannedAt: string | null };

function itemGames(item: CatalogItem): GameSummary[] {
  return item.kind === "saved" ? item.games : [item.game];
}

export default function CatalogPage() {
  const [items, setItems] = useState<CatalogItem[] | null>(null);
  const [games, setGames] = useState<GameWithScan[]>([]);
  const [view, setView] = useState<ViewMode>("marketplace");
  const [scanning, setScanning] = useState(false);

  const [query, setQuery] = useState("");
  const [gameFilter, setGameFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [domainFilter, setDomainFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [freeOnly, setFreeOnly] = useState(false);
  const [sort, setSort] = useState<SortMode>("newest");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  const loadCatalog = () => fetch("/api/catalog").then((r) => r.json()).then(setItems);
  const loadGames = () => fetch("/api/games").then((r) => r.json()).then(setGames);

  useEffect(() => {
    loadCatalog();
    loadGames();
  }, []);

  const domains = useMemo(() => {
    const set = new Set((items ?? []).map((i) => i.domain));
    return Array.from(set).sort();
  }, [items]);

  // Base UI's <Select.Value> only knows an item's label once the popup has
  // mounted, unless the root is given a value->label map up front.
  const gameItems = useMemo(
    () => ({ all: "All games", ...Object.fromEntries(games.map((g) => [String(g.id), g.name])) }),
    [games]
  );
  const typeItems = useMemo(
    () => ({ all: "All types", ...Object.fromEntries(PRODUCT_TYPES.map((t) => [t.value, t.label])) }),
    []
  );
  const domainItems = useMemo(
    () => ({ all: "All sources", ...Object.fromEntries(domains.map((d) => [d, SITE_LABELS[d] ?? d])) }),
    [domains]
  );
  const statusItems = useMemo(
    () => ({ all: "All statuses", ...Object.fromEntries(PRODUCT_STATUSES.map((s) => [s.value, s.label])) }),
    []
  );
  const sortItems = { newest: "Newest", title: "Title A-Z", "price-low": "Price: Low", "price-high": "Price: High" };

  const filtered = useMemo(() => {
    if (!items) return [];
    const q = query.trim().toLowerCase();

    let list = items.filter((item) => {
      const itemGameList = itemGames(item);
      if (gameFilter !== "all" && !itemGameList.some((g) => String(g.id) === gameFilter)) return false;
      if (typeFilter === "all" && item.type === "other") return false;
      if (typeFilter !== "all" && item.type !== typeFilter) return false;
      if (domainFilter !== "all" && item.domain !== domainFilter) return false;
      if (statusFilter !== "all" && (item.kind !== "saved" || item.status !== statusFilter)) return false;
      if (freeOnly && !item.isFree) return false;
      if (q) {
        const notes = item.kind === "saved" ? item.notes ?? "" : "";
        const hay = [item.title, item.creator ?? "", notes, ...itemGameList.map((g) => g.name)].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      switch (sort) {
        case "title": return a.title.localeCompare(b.title);
        case "price-low": return (a.isFree ? 0 : a.price ?? Infinity) - (b.isFree ? 0 : b.price ?? Infinity);
        case "price-high": return (b.isFree ? 0 : b.price ?? -Infinity) - (a.isFree ? 0 : a.price ?? -Infinity);
        default: return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return list;
  }, [items, query, gameFilter, typeFilter, domainFilter, statusFilter, freeOnly, sort]);

  const savedFiltered = useMemo(() => filtered.filter((i) => i.kind === "saved"), [filtered]);

  const openAdd = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (p: Product) => { setEditing(p); setDialogOpen(true); };

  const upsertLocal = (p: Product) => {
    setItems((prev) => {
      if (!prev) return [{ ...p, kind: "saved" }];
      const withoutDiscoveredDupe = prev.filter((i) => !(i.kind === "discovered" && i.url === p.url));
      const exists = withoutDiscoveredDupe.some((i) => i.kind === "saved" && i.id === p.id);
      return exists
        ? withoutDiscoveredDupe.map((i) => (i.kind === "saved" && i.id === p.id ? { ...p, kind: "saved" } : i))
        : [{ ...p, kind: "saved" }, ...withoutDiscoveredDupe];
    });
  };
  const removeLocal = (id: number) =>
    setItems((prev) => prev?.filter((i) => !(i.kind === "saved" && i.id === id)) ?? prev);

  const handleScanNow = async () => {
    setScanning(true);
    try {
      const res = await fetch("/api/catalog/scan", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Scan failed.");
      toast.success(`Scanned ${data.scanned} game${data.scanned === 1 ? "" : "s"}, found ${data.newPrints} new print${data.newPrints === 1 ? "" : "s"}.`);
      loadCatalog();
      loadGames();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Scan failed.");
    } finally {
      setScanning(false);
    }
  };

  const hasAnyItems = (items?.length ?? 0) > 0;
  const collectionGames = games.filter((g) => g.inCollection);
  const scannedCount = collectionGames.filter((g) => g.lastScannedAt).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h1 className="font-display font-extrabold uppercase text-3xl tracking-tight leading-none">Catalog</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {items === null ? "Loading…" : `${filtered.length} of ${items.length} print${items.length === 1 ? "" : "s"}`}
            {collectionGames.length > 0 && ` (${scannedCount} of ${collectionGames.length} games scanned)`}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="secondary" onClick={handleScanNow} disabled={scanning} className="gap-1.5">
            <RefreshCw className={cn("size-4", scanning && "animate-spin")} /> {scanning ? "Scanning…" : "Scan now"}
          </Button>
          <Button onClick={openAdd} className="gap-1.5">
            <Plus className="size-4" /> Add a print
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search prints, games, notes…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 font-mono"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select items={gameItems} value={gameFilter} onValueChange={(v) => setGameFilter(v as string)}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="All games" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All games</SelectItem>
              {games.map((g) => <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select items={typeItems} value={typeFilter} onValueChange={(v) => setTypeFilter(v as string)}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="All types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {PRODUCT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select items={domainItems} value={domainFilter} onValueChange={(v) => setDomainFilter(v as string)}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="All sources" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              {domains.map((d) => <SelectItem key={d} value={d}>{SITE_LABELS[d] ?? d}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select items={statusItems} value={statusFilter} onValueChange={(v) => setStatusFilter(v as string)}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {PRODUCT_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>

          <button
            onClick={() => setFreeOnly((f) => !f)}
            className={cn(
              "text-sm px-3 h-8 rounded-lg border transition-colors",
              freeOnly ? "bg-primary text-primary-foreground border-primary" : "border-input text-muted-foreground hover:text-foreground"
            )}
          >
            Free Only
          </button>

          <Select items={sortItems} value={sort} onValueChange={(v) => setSort(v as SortMode)}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="title">Title A-Z</SelectItem>
              <SelectItem value="price-low">Price: Low</SelectItem>
              <SelectItem value="price-high">Price: High</SelectItem>
            </SelectContent>
          </Select>

          <div className="ml-auto flex items-center gap-0.5 border border-input rounded-lg p-0.5">
            <button
              onClick={() => setView("marketplace")}
              aria-label="Marketplace view"
              className={cn("p-1.5 rounded-md", view === "marketplace" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              <LayoutGrid className="size-4" />
            </button>
            <button
              onClick={() => setView("spreadsheet")}
              aria-label="Spreadsheet view"
              className={cn("p-1.5 rounded-md", view === "spreadsheet" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              <Rows3 className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {items === null && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="aspect-[4/3.6] rounded-lg" />)}
        </div>
      )}

      {items !== null && !hasAnyItems && (
        <div className="text-center py-20 border border-dashed border-border rounded-lg bed-grid">
          <p className="font-display font-bold text-xl uppercase mb-1">Nothing here yet</p>
          <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
            Connect your BGG collection to start auto-discovering prints, or add your first find by pasting a link.
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={openAdd} className="gap-1.5"><Plus className="size-4" /> Add a print</Button>
            <Button variant="outline" nativeButton={false} render={<a href="/connect" />}>Connect BGG</Button>
          </div>
        </div>
      )}

      {items !== null && hasAnyItems && filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p>No prints match those filters.</p>
        </div>
      )}

      {filtered.length > 0 && view === "marketplace" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filtered.map((item) =>
            item.kind === "saved" ? (
              <ProductCard key={`p-${item.id}`} product={item} onClick={() => openEdit(item)} />
            ) : (
              <DiscoveredPrintCard key={`d-${item.id}`} item={item} onSaved={upsertLocal} />
            )
          )}
        </div>
      )}

      {filtered.length > 0 && view === "spreadsheet" && (
        <div className="border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground font-mono">
                <th className="py-2 pl-3 pr-2"></th>
                <th className="py-2 pr-3">Print</th>
                <th className="py-2 pr-3">Games</th>
                <th className="py-2 pr-3">Type</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Price</th>
                <th className="py-2 pr-3">Rating</th>
              </tr>
            </thead>
            <tbody>
              {savedFiltered.map((p) => <ProductRow key={p.id} product={p} onClick={() => openEdit(p)} />)}
            </tbody>
          </table>
          {savedFiltered.length === 0 && (
            <p className="text-center py-8 text-sm text-muted-foreground">
              Not-yet-saved discoveries only show in the marketplace view above. Save one to see it here.
            </p>
          )}
        </div>
      )}

      <ProductDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        games={games}
        product={editing}
        onSaved={upsertLocal}
        onDeleted={removeLocal}
      />
    </div>
  );
}
