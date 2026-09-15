"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Search as SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { PublicSearchResultCard } from "@/components/public-search-result-card";
import { ProductDialog, type ProductPrefill } from "@/components/product-dialog";
import type { ProviderOutcome, ProviderResult } from "@/lib/providers/types";
import type { GameSummary, Product } from "@/lib/types";
import { guessTypeFromTitle } from "@/lib/providers/guess-type";
import { PRODUCT_TYPES, SITE_LABELS } from "@/lib/constants";

type SortMode = "relevance" | "price-low" | "price-high" | "rating";
type FlatResult = { result: ProviderResult; siteName: string; domain: string };

export default function PublicSearchPage() {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [outcomes, setOutcomes] = useState<ProviderOutcome[] | null>(null);
  const [sort, setSort] = useState<SortMode>("relevance");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [domainFilter, setDomainFilter] = useState<string>("all");
  const [freeOnly, setFreeOnly] = useState(false);

  // Anyone can load /search (see proxy.ts) -- only the signed-in owner gets
  // an "Add to catalog" action, so this fetches nothing DB-backed until
  // that's confirmed.
  const [signedIn, setSignedIn] = useState(false);
  const [games, setGames] = useState<GameSummary[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [prefill, setPrefill] = useState<ProductPrefill | null>(null);
  const [savedUrls, setSavedUrls] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/auth/session").then((r) => r.json()).then((d) => {
      setSignedIn(d.signedIn);
      if (d.signedIn) fetch("/api/games").then((r) => r.json()).then(setGames);
    });
  }, []);

  const openAddDialog = (result: ProviderResult, siteName: string, domain: string) => {
    setPrefill({
      url: result.url,
      title: result.title,
      thumbnailUrl: result.thumbnailUrl,
      domain,
      siteName,
      creator: result.creator,
      price: result.price,
      isFree: result.isFree,
      type: guessTypeFromTitle(result.title),
      rating: result.rating,
      ratingCount: result.ratingCount,
      likesCount: result.likesCount,
    });
    setDialogOpen(true);
  };

  const handleSaved = (product: Product) => {
    setSavedUrls((prev) => new Set(prev).add(product.url));
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch("/api/public-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Search failed.");
      setOutcomes(data.providers);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setSearching(false);
    }
  };

  const allResults: FlatResult[] = (outcomes ?? []).flatMap((o) =>
    o.results.map((r) => ({ result: r, siteName: o.siteName, domain: o.domain }))
  );
  const problems = (outcomes ?? []).filter((o) => o.error || (o.needsCredentials && !o.hasCredentials));

  const availableTypes = useMemo(
    () => new Set(allResults.map((r) => guessTypeFromTitle(r.result.title))),
    [allResults]
  );
  const availableDomains = useMemo(() => new Set(allResults.map((r) => r.domain)), [allResults]);

  const flatResults = useMemo(() => {
    let list = allResults.filter((r) => {
      if (typeFilter !== "all" && guessTypeFromTitle(r.result.title) !== typeFilter) return false;
      if (domainFilter !== "all" && r.domain !== domainFilter) return false;
      if (freeOnly && !r.result.isFree) return false;
      return true;
    });
    if (sort !== "relevance") {
      list = [...list].sort((a, b) => {
        switch (sort) {
          case "price-low": return (a.result.isFree ? 0 : a.result.price ?? Infinity) - (b.result.isFree ? 0 : b.result.price ?? Infinity);
          case "price-high": return (b.result.isFree ? 0 : b.result.price ?? -Infinity) - (a.result.isFree ? 0 : a.result.price ?? -Infinity);
          case "rating": return (b.result.rating ?? 0) - (a.result.rating ?? 0) || (b.result.likesCount ?? 0) - (a.result.likesCount ?? 0);
          default: return 0;
        }
      });
    }
    return list;
  }, [allResults, sort, typeFilter, domainFilter, freeOnly]);

  const typeItems = { all: "All types", ...Object.fromEntries(PRODUCT_TYPES.filter((t) => availableTypes.has(t.value)).map((t) => [t.value, t.label])) };
  const domainItems = { all: "All sources", ...Object.fromEntries([...availableDomains].sort().map((d) => [d, SITE_LABELS[d] ?? d])) };
  const sortItems = { relevance: "Relevance", "price-low": "Price: Low", "price-high": "Price: High", rating: "Top rated" };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display font-extrabold uppercase text-3xl tracking-tight leading-none">Search</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Look up 3D-printable board game accessories across Printables, Thingiverse, Cults3D, Etsy,
          and MyMiniFactory. No account needed.
        </p>
      </div>

      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Try a game name, or a print category like dice tower…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="pl-9 pr-28 font-mono"
        />
        <Button
          onClick={handleSearch}
          disabled={searching || !query.trim()}
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7"
        >
          {searching ? "Searching…" : "Search"}
        </Button>
      </div>

      {problems.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {problems.map((o) => (
            <span key={o.domain} className="text-xs px-2 py-1 rounded-full bg-destructive/10 text-destructive">
              {o.siteName}: {o.error ? o.error : "not configured on this deployment"}
            </span>
          ))}
        </div>
      )}

      {allResults.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Select items={typeItems} value={typeFilter} onValueChange={(v) => setTypeFilter(v as string)}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="All types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {PRODUCT_TYPES.filter((t) => availableTypes.has(t.value)).map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select items={domainItems} value={domainFilter} onValueChange={(v) => setDomainFilter(v as string)}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="All sources" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              {[...availableDomains].sort().map((d) => <SelectItem key={d} value={d}>{SITE_LABELS[d] ?? d}</SelectItem>)}
            </SelectContent>
          </Select>
          <button
            onClick={() => setFreeOnly((f) => !f)}
            className={`text-sm px-3 h-8 rounded-lg border transition-colors ${freeOnly ? "bg-primary text-primary-foreground border-primary" : "border-input text-muted-foreground hover:text-foreground"}`}
          >
            Free Only
          </button>
          <Select items={sortItems} value={sort} onValueChange={(v) => setSort(v as SortMode)}>
            <SelectTrigger className="w-[140px] ml-auto"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">Relevance</SelectItem>
              <SelectItem value="price-low">Price: Low</SelectItem>
              <SelectItem value="price-high">Price: High</SelectItem>
              <SelectItem value="rating">Top rated</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {outcomes !== null && flatResults.length === 0 && (
        <p className="text-sm text-muted-foreground py-12 text-center">
          {allResults.length === 0 ? "No results. Try a different search." : "No results match those filters."}
        </p>
      )}

      {flatResults.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {flatResults.map(({ result, siteName, domain }) => (
            <PublicSearchResultCard
              key={result.url}
              result={result}
              siteName={siteName}
              onAdd={signedIn ? () => openAddDialog(result, siteName, domain) : undefined}
              alreadySaved={savedUrls.has(result.url)}
            />
          ))}
        </div>
      )}

      {signedIn && (
        <ProductDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          games={games}
          prefill={prefill ?? undefined}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
