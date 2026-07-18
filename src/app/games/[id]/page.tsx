"use client";

import { use, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, ExternalLink, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductCard } from "@/components/product-card";
import { ProductDialog } from "@/components/product-dialog";
import { SearchResultsAggregator } from "@/components/search-results-aggregator";
import { searchLinksForGame } from "@/lib/search-links";
import type { ProviderOutcome, ProviderResult } from "@/lib/providers/types";
import type { Game, GameSummary, Product } from "@/lib/types";

type AnnotatedOutcome = Omit<ProviderOutcome, "results"> & {
  results: Array<ProviderResult & { alreadySaved: boolean }>;
};

interface GameDetail extends Game {
  products: Product[];
}

export default function GameDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [game, setGame] = useState<GameDetail | null>(null);
  const [games, setGames] = useState<GameSummary[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [outcomes, setOutcomes] = useState<AnnotatedOutcome[] | null>(null);
  const [searching, setSearching] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/games/${id}`).then((r) => r.json()).then((g) => { setGame(g); setOutcomes(null); });
    fetch("/api/games").then((r) => r.json()).then(setGames);
  }, [id]);

  const openAdd = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (p: Product) => { setEditing(p); setDialogOpen(true); };

  const handleSearchAllSites = async () => {
    if (!game) return;
    setSearching(true);
    try {
      const res = await fetch("/api/search-sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: game.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Search failed.");
      setOutcomes(data.providers);
      fetch(`/api/games/${game.id}/mark-scanned`, { method: "POST" }).catch(() => {});
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setSearching(false);
    }
  };

  const upsertLocal = (p: Product) => {
    setGame((g) => {
      if (!g) return g;
      const exists = g.products.some((x) => x.id === p.id);
      const products = exists ? g.products.map((x) => (x.id === p.id ? p : x)) : [p, ...g.products];
      return { ...g, products };
    });
  };
  const removeLocal = (productId: number) => {
    setGame((g) => (g ? { ...g, products: g.products.filter((p) => p.id !== productId) } : g));
  };

  if (!game) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="flex gap-6">
          <Skeleton className="w-40 h-52 rounded-lg shrink-0" />
          <Skeleton className="h-40 flex-1" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex gap-6 items-start flex-col sm:flex-row">
        {game.image && (
          <div className="relative w-40 h-52 shrink-0 rounded-lg overflow-hidden border border-border">
            <Image src={game.image} alt={game.name} fill className="object-cover" unoptimized />
          </div>
        )}
        <div className="flex-1 min-w-0 space-y-2">
          <Link href="/games" className="text-xs text-muted-foreground hover:text-foreground">← All games</Link>
          <h1 className="font-display font-extrabold uppercase text-3xl tracking-tight leading-none">{game.name}</h1>
          {game.yearPublished && <p className="text-sm text-muted-foreground">{game.yearPublished}</p>}
          <p className="text-sm text-muted-foreground">
            {game.products.length} print{game.products.length === 1 ? "" : "s"} saved
          </p>
          <div className="flex gap-2 pt-1 flex-wrap">
            <Button onClick={openAdd} className="gap-1.5"><Plus className="size-4" /> Add a print for this game</Button>
            <Button variant="secondary" className="gap-1.5" onClick={handleSearchAllSites} disabled={searching}>
              <Search className="size-4" /> {searching ? "Searching…" : "Search all sites"}
            </Button>
            <Button
              variant="outline"
              className="gap-1.5"
              nativeButton={false}
              render={<a href={`https://boardgamegeek.com/boardgame/${game.bggId}`} target="_blank" rel="noopener noreferrer" />}
            >
              BGG <ExternalLink className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {game.products.length === 0 && (
        <div className="text-center py-12 border border-dashed border-border rounded-lg bed-grid">
          <p className="text-sm text-muted-foreground mb-1">No prints saved for {game.name} yet.</p>
          <p className="text-xs text-muted-foreground">Search a site below, then paste the link back here.</p>
        </div>
      )}

      {game.products.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {game.products.map((p) => <ProductCard key={p.id} product={p} onClick={() => openEdit(p)} />)}
        </div>
      )}

      <div ref={resultsRef} className="space-y-3 pt-2 border-t border-border">
        <h2 className="text-sm font-semibold pt-4">Look for more</h2>

        {outcomes && (
          <SearchResultsAggregator outcomes={outcomes} gameId={game.id} onSaved={upsertLocal} />
        )}

        <p className="text-xs text-muted-foreground pt-1">
          MakerWorld and MyMiniFactory can&apos;t be searched automatically, so browse them directly instead:
        </p>
        <div className="flex flex-wrap gap-2">
          {searchLinksForGame(game.name).map((s) => (
            <a
              key={s.key}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono px-2.5 py-1.5 rounded-md border border-border bg-card hover:border-primary/60 hover:text-primary transition-colors"
            >
              {s.label} ↗
            </a>
          ))}
        </div>
      </div>

      <ProductDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        games={games}
        product={editing}
        defaultGameId={game.id}
        onSaved={upsertLocal}
        onDeleted={removeLocal}
      />
    </div>
  );
}
