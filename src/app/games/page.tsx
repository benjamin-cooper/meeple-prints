"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Search, TriangleAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { Game } from "@/lib/types";
import { cn } from "@/lib/utils";
import { isNoisyGame } from "@/lib/constants";

type SortMode = "gaps" | "noisy" | "name";

function isSortMode(value: string | null): value is SortMode {
  return value === "gaps" || value === "noisy" || value === "name";
}

export default function GamesPage() {
  return (
    <Suspense>
      <GamesPageContent />
    </Suspense>
  );
}

function GamesPageContent() {
  const searchParams = useSearchParams();
  const [games, setGames] = useState<Game[] | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>(() => {
    const fromUrl = searchParams.get("sort");
    return isSortMode(fromUrl) ? fromUrl : "gaps";
  });

  useEffect(() => {
    fetch("/api/games").then((r) => r.json()).then(setGames);
  }, []);

  const filtered = useMemo(() => {
    if (!games) return [];
    const q = query.trim().toLowerCase();
    let list = games.filter((g) => g.inCollection && (!q || g.name.toLowerCase().includes(q)));
    list = [...list].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "noisy") {
        const ratio = (g: Game) => {
          const s = g.discoveredStats;
          return s && s.total > 0 ? s.hidden / s.total : 0;
        };
        return ratio(b) - ratio(a) || a.name.localeCompare(b.name);
      }
      const ac = a._count?.products ?? 0;
      const bc = b._count?.products ?? 0;
      return ac - bc || a.name.localeCompare(b.name);
    });
    return list;
  }, [games, query, sort]);

  const gapCount = games?.filter((g) => g.inCollection && (g._count?.products ?? 0) === 0).length ?? 0;
  const noisyCount = games?.filter((g) => g.inCollection && isNoisyGame(g.discoveredStats)).length ?? 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display font-extrabold uppercase text-3xl tracking-tight leading-none">Games</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {games === null ? (
            "Loading…"
          ) : (
            <>
              {gapCount > 0
                ? `${gapCount} game${gapCount === 1 ? " has" : "s have"} no prints saved yet`
                : "Every game in your collection has at least one saved print."}
              {noisyCount > 0 && (
                <>
                  {" · "}
                  <span className="text-destructive font-medium">
                    {noisyCount} game{noisyCount === 1 ? " is" : "s are"} mostly noise
                  </span>
                </>
              )}
            </>
          )}
        </p>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Search your collection…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
        </div>
        <div className="flex items-center gap-0.5 border border-input rounded-lg p-0.5">
          <button
            onClick={() => setSort("gaps")}
            className={cn("px-3 h-7 rounded-md text-sm", sort === "gaps" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            Needs Prints
          </button>
          <button
            onClick={() => setSort("noisy")}
            className={cn("px-3 h-7 rounded-md text-sm", sort === "noisy" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            Noisiest
          </button>
          <button
            onClick={() => setSort("name")}
            className={cn("px-3 h-7 rounded-md text-sm", sort === "name" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            A-Z
          </button>
        </div>
      </div>

      {games === null && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
          {Array.from({ length: 16 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-lg" />)}
        </div>
      )}

      {games !== null && games.filter((g) => g.inCollection).length === 0 && (
        <div className="text-center py-20 border border-dashed border-border rounded-lg bed-grid">
          <p className="font-display font-bold text-xl uppercase mb-1">No collection connected</p>
          <p className="text-sm text-muted-foreground mb-4">Connect your BGG account to pull in your games.</p>
          <Link href="/connect" className="text-primary underline underline-offset-4 text-sm font-medium">Go to Connect</Link>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
          {filtered.map((g) => {
            const count = g._count?.products ?? 0;
            const noisy = isNoisyGame(g.discoveredStats);
            const hiddenPct = g.discoveredStats && g.discoveredStats.total > 0
              ? Math.round((g.discoveredStats.hidden / g.discoveredStats.total) * 100)
              : 0;
            return (
              <Link
                key={g.id}
                href={`/games/${g.id}`}
                className="group flex flex-col rounded-lg border border-border bg-card overflow-hidden hover:border-primary/60 hover:shadow-sm transition-all"
              >
                <div className="relative aspect-square bg-muted">
                  {g.thumbnail ? (
                    <Image src={g.thumbnail} alt="" fill className="object-cover" unoptimized />
                  ) : (
                    <div className="w-full h-full bed-grid" />
                  )}
                  {noisy && (
                    <span
                      title={`${hiddenPct}% of found results for this game have been hidden as noise`}
                      className="absolute top-1.5 left-1.5 size-5 rounded-full bg-destructive text-white flex items-center justify-center"
                    >
                      <TriangleAlert className="size-3" />
                    </span>
                  )}
                  <span
                    className={cn(
                      "absolute bottom-1.5 right-1.5 min-w-5 h-5 px-1 rounded-full text-[11px] font-mono font-semibold flex items-center justify-center",
                      count === 0 ? "bg-destructive text-white" : "bg-popover/90 text-popover-foreground ring-1 ring-foreground/10"
                    )}
                  >
                    {count}
                  </span>
                </div>
                <p className="text-xs font-medium px-2 py-1.5 line-clamp-2 leading-snug">{g.name}</p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
