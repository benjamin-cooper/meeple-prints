"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SearchResultCard } from "@/components/search-result-card";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { guessTypeFromTitle } from "@/lib/providers/guess-type";
import { PRODUCT_TYPES } from "@/lib/constants";
import type { ProviderOutcome, ProviderResult } from "@/lib/providers/types";
import type { Product } from "@/lib/types";

interface AnnotatedOutcome extends Omit<ProviderOutcome, "results"> {
  results: Array<ProviderResult & { alreadySaved: boolean }>;
}

interface FlatResult extends ProviderResult {
  alreadySaved: boolean;
  domain: string;
  siteName: string;
  guessedType: string;
}

type SortMode = "relevance" | "price-low" | "price-high";

const SORT_ITEMS = { relevance: "Best Match", "price-low": "Price: Low", "price-high": "Price: High" };

/**
 * Merges every provider's hits into one filterable list, the same shape as
 * the Catalog, instead of chopping results into a section per site.
 */
export function SearchResultsAggregator({
  outcomes,
  gameId,
  onSaved,
}: {
  outcomes: AnnotatedOutcome[];
  gameId: number;
  onSaved: (product: Product) => void;
}) {
  const [sourceFilter, setSourceFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [freeOnly, setFreeOnly] = useState(false);
  const [sort, setSort] = useState<SortMode>("relevance");

  const flat: FlatResult[] = useMemo(
    () =>
      outcomes.flatMap((o) =>
        o.results.map((r) => ({ ...r, domain: o.domain, siteName: o.siteName, guessedType: guessTypeFromTitle(r.title) }))
      ),
    [outcomes]
  );

  const sitesWithResults = useMemo(() => outcomes.filter((o) => o.results.length > 0), [outcomes]);
  const sourceItems = useMemo(
    () => ({ all: "All sources", ...Object.fromEntries(sitesWithResults.map((o) => [o.domain, o.siteName])) }),
    [sitesWithResults]
  );

  const typeItems = useMemo(
    () => ({ all: "All types", ...Object.fromEntries(PRODUCT_TYPES.map((t) => [t.value, t.label])) }),
    []
  );

  const filtered = useMemo(() => {
    let list = flat.filter((r) => {
      if (sourceFilter !== "all" && r.domain !== sourceFilter) return false;
      if (typeFilter !== "all" && r.guessedType !== typeFilter) return false;
      if (freeOnly && !r.isFree) return false;
      return true;
    });
    if (sort === "price-low") {
      list = [...list].sort((a, b) => (a.isFree ? 0 : a.price ?? Infinity) - (b.isFree ? 0 : b.price ?? Infinity));
    } else if (sort === "price-high") {
      list = [...list].sort((a, b) => (b.isFree ? 0 : b.price ?? -Infinity) - (a.isFree ? 0 : a.price ?? -Infinity));
    }
    return list;
  }, [flat, sourceFilter, typeFilter, freeOnly, sort]);

  const problems = outcomes.filter((o) => o.error || (o.needsCredentials && !o.hasCredentials));

  return (
    <div className="space-y-3">
      {problems.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {problems.map((o) => (
            <span key={o.domain}>
              {o.siteName}:{" "}
              {o.error ? o.error : (
                <>needs an API key, <Link href="/connect" className="underline underline-offset-4">add one</Link></>
              )}
            </span>
          ))}
        </div>
      )}

      {flat.length === 0 ? (
        <p className="text-sm text-muted-foreground">No matches on any configured site.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Select items={sourceItems} value={sourceFilter} onValueChange={(v) => setSourceFilter(v as string)}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                {sitesWithResults.map((o) => <SelectItem key={o.domain} value={o.domain}>{o.siteName}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select items={typeItems} value={typeFilter} onValueChange={(v) => setTypeFilter(v as string)}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {PRODUCT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
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

            <Select items={SORT_ITEMS} value={sort} onValueChange={(v) => setSort(v as SortMode)}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Best Match</SelectItem>
                <SelectItem value="price-low">Price: Low</SelectItem>
                <SelectItem value="price-high">Price: High</SelectItem>
              </SelectContent>
            </Select>

            <span className="text-xs text-muted-foreground font-mono ml-auto">
              {filtered.length} result{filtered.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map((r) => (
              <SearchResultCard
                key={`${r.domain}-${r.url}`}
                result={r}
                domain={r.domain}
                siteName={r.siteName}
                type={r.guessedType}
                gameId={gameId}
                onSaved={onSaved}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
