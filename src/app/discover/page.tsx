"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { SearchResultsAggregator } from "@/components/search-results-aggregator";
import { UNSUPPORTED_SITES } from "@/lib/providers/unsupported-sites";
import type { ProviderOutcome, ProviderResult } from "@/lib/providers/types";
import type { Game, GameSummary, Product } from "@/lib/types";
import { cn } from "@/lib/utils";

type AnnotatedOutcome = Omit<ProviderOutcome, "results"> & {
  results: Array<ProviderResult & { alreadySaved: boolean }>;
};

interface GameResult {
  game: GameSummary;
  outcomes: AnnotatedOutcome[];
}

interface ProviderStatus {
  key: "thingiverseToken" | "cultsUsername" | "etsyApiKey";
  label: string;
}

const NEEDS_KEY: ProviderStatus[] = [
  { key: "thingiverseToken", label: "Thingiverse" },
  { key: "cultsUsername", label: "Cults3D" },
  { key: "etsyApiKey", label: "Etsy" },
];

const BATCH_SIZES = ["5", "10", "20"];

function GameResultSection({ result, onSaved }: { result: GameResult; onSaved: (product: Product) => void }) {
  return (
    <div className="border-t border-border pt-4 space-y-3">
      <Link href={`/games/${result.game.id}`} className="text-sm font-semibold hover:text-primary">
        {result.game.name} ↗
      </Link>
      <SearchResultsAggregator outcomes={result.outcomes} gameId={result.game.id} onSaved={onSaved} />
    </div>
  );
}

export default function DiscoverPage() {
  const [settings, setSettings] = useState<Record<string, string | null> | null>(null);
  const [allGames, setAllGames] = useState<GameSummary[]>([]);
  const [totalGames, setTotalGames] = useState<number | null>(null);
  const [scannedGames, setScannedGames] = useState<number | null>(null);

  const [batchSize, setBatchSize] = useState("5");
  const [scanning, setScanning] = useState(false);
  const [scanningGameName, setScanningGameName] = useState<string | null>(null);
  const [batchResults, setBatchResults] = useState<GameResult[]>([]);

  const [singleQuery, setSingleQuery] = useState("");
  const [searchingGameId, setSearchingGameId] = useState<number | null>(null);
  const [singleResult, setSingleResult] = useState<GameResult | null>(null);

  const loadCounts = () => {
    fetch("/api/games").then((r) => r.json()).then((games: Array<Game & { lastScannedAt?: string | null }>) => {
      setAllGames(games.filter((g) => g.inCollection));
      setTotalGames(games.filter((g) => g.inCollection).length);
      setScannedGames(games.filter((g) => g.inCollection && g.lastScannedAt).length);
    });
  };

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then(setSettings);
    loadCounts();
  }, []);

  const matches = useMemo(() => {
    const q = singleQuery.trim().toLowerCase();
    if (!q) return [];
    return allGames.filter((g) => g.name.toLowerCase().includes(q)).slice(0, 8);
  }, [allGames, singleQuery]);

  const runSearch = async (game: GameSummary): Promise<GameResult> => {
    const res = await fetch("/api/search-sites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId: game.id }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Search failed.");
    fetch(`/api/games/${game.id}/mark-scanned`, { method: "POST" }).catch(() => {});
    return { game, outcomes: data.providers };
  };

  const handleSearchOne = async (game: GameSummary) => {
    setSingleQuery("");
    setSearchingGameId(game.id);
    setSingleResult(null);
    try {
      const result = await runSearch(game);
      setSingleResult(result);
      loadCounts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setSearchingGameId(null);
    }
  };

  const upsertBatch = (product: Product) => {
    setBatchResults((prev) =>
      prev.map((gr) => ({
        ...gr,
        outcomes: gr.outcomes.map((o) => ({
          ...o,
          results: o.results.map((r) => (r.url === product.url ? { ...r, alreadySaved: true } : r)),
        })),
      }))
    );
  };

  const upsertSingle = (product: Product) => {
    setSingleResult((gr) =>
      gr
        ? {
            ...gr,
            outcomes: gr.outcomes.map((o) => ({
              ...o,
              results: o.results.map((r) => (r.url === product.url ? { ...r, alreadySaved: true } : r)),
            })),
          }
        : gr
    );
  };

  const handleScanBatch = async () => {
    setScanning(true);
    setBatchResults([]);
    try {
      const queueRes = await fetch(`/api/games/next-unscanned?limit=${batchSize}`);
      const queue: GameSummary[] = await queueRes.json();
      if (queue.length === 0) {
        toast.error("No games in your collection yet. Connect BGG first.");
        return;
      }

      for (const game of queue) {
        setScanningGameName(game.name);
        try {
          const result = await runSearch(game);
          setBatchResults((prev) => [...prev, result]);
        } catch {
          // Keep going even if one game's search fails outright.
        }
        await new Promise((r) => setTimeout(r, 400));
      }

      loadCounts();
    } finally {
      setScanning(false);
      setScanningGameName(null);
    }
  };

  const configuredCount = settings
    ? 1 + NEEDS_KEY.filter((p) => settings[p.key]).length // Printables always on
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-extrabold uppercase text-3xl tracking-tight leading-none">Discover</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Search every configured site at once for games in your collection.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm font-semibold">
            {configuredCount != null ? `${configuredCount} of 4 sites searchable` : "Checking sites…"}
          </p>
          <Link href="/connect" className="text-xs underline underline-offset-4 text-muted-foreground">
            Manage API keys
          </Link>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs px-2 py-1 rounded-full bg-status-printed/15 text-status-printed font-medium">Printables</span>
          {NEEDS_KEY.map((p) => (
            <span
              key={p.key}
              className={cn(
                "text-xs px-2 py-1 rounded-full font-medium",
                settings?.[p.key] ? "bg-status-printed/15 text-status-printed" : "bg-muted text-muted-foreground"
              )}
            >
              {p.label}
            </span>
          ))}
          {UNSUPPORTED_SITES.map((s) => (
            <span key={s.label} className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground/60 line-through decoration-1">
              {s.label}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <p className="text-sm font-semibold">Search one game</p>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Type a game from your collection…"
            value={singleQuery}
            onChange={(e) => setSingleQuery(e.target.value)}
            className="pl-9"
          />
          {matches.length > 0 && (
            <div className="absolute z-10 top-full mt-1 w-full rounded-lg border border-border bg-popover shadow-md overflow-hidden">
              {matches.map((g) => (
                <button
                  key={g.id}
                  onClick={() => handleSearchOne(g)}
                  disabled={searchingGameId === g.id}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-secondary disabled:opacity-50"
                >
                  {searchingGameId === g.id ? `Searching “${g.name}”…` : g.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {singleResult && <GameResultSection result={singleResult} onSaved={upsertSingle} />}

      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-sm font-semibold">Scan your collection</p>
            <p className="text-xs text-muted-foreground">
              {scannedGames != null && totalGames != null
                ? `${scannedGames} of ${totalGames} games scanned at least once`
                : "Loading your collection…"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={batchSize} onValueChange={(v) => setBatchSize(v as string)}>
              <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {BATCH_SIZES.map((n) => <SelectItem key={n} value={n}>{n} games</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={handleScanBatch} disabled={scanning} className="gap-1.5">
              <Search className="size-4" /> {scanning ? "Scanning…" : "Scan next batch"}
            </Button>
          </div>
        </div>
        {scanning && scanningGameName && (
          <p className="text-xs text-muted-foreground font-mono">Searching for &quot;{scanningGameName}&quot;…</p>
        )}
        <p className="text-xs text-muted-foreground">
          This always works through whichever games haven&apos;t been scanned in the longest, so it also catches
          new uploads if you run it again later.
        </p>
      </div>

      {batchResults.length > 0 && (
        <div className="space-y-8">
          {batchResults.map((result) => (
            <GameResultSection key={result.game.id} result={result} onSaved={upsertBatch} />
          ))}
        </div>
      )}
    </div>
  );
}
