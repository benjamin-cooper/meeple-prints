"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Search as SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PublicSearchResultCard } from "@/components/public-search-result-card";
import type { ProviderOutcome } from "@/lib/providers/types";

export default function PublicSearchPage() {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [outcomes, setOutcomes] = useState<ProviderOutcome[] | null>(null);

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

  const flatResults = (outcomes ?? []).flatMap((o) =>
    o.results.map((r) => ({ result: r, siteName: o.siteName }))
  );
  const problems = (outcomes ?? []).filter((o) => o.error || (o.needsCredentials && !o.hasCredentials));

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

      {outcomes !== null && flatResults.length === 0 && (
        <p className="text-sm text-muted-foreground py-12 text-center">No results. Try a different search.</p>
      )}

      {flatResults.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {flatResults.map(({ result, siteName }) => (
            <PublicSearchResultCard key={result.url} result={result} siteName={siteName} />
          ))}
        </div>
      )}
    </div>
  );
}
