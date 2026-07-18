"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import type { GameSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

export function GamePicker({
  games,
  selectedIds,
  onChange,
}: {
  games: GameSummary[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return games;
    return games.filter((g) => g.name.toLowerCase().includes(q));
  }, [games, query]);

  const toggle = (id: number) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  };

  return (
    <div className="border border-input rounded-md overflow-hidden">
      <Input
        placeholder="Filter games…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="rounded-none border-0 border-b border-input focus-visible:ring-0"
      />
      <div className="max-h-48 overflow-y-auto divide-y divide-border">
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground px-3 py-4 text-center">No games match &quot;{query}&quot;.</p>
        )}
        {filtered.map((g) => {
          const checked = selectedIds.includes(g.id);
          return (
            <label
              key={g.id}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-secondary text-sm",
                checked && "bg-accent"
              )}
            >
              <Checkbox checked={checked} onCheckedChange={() => toggle(g.id)} />
              {g.thumbnail ? (
                <Image src={g.thumbnail} alt="" width={24} height={24} className="rounded-sm object-cover shrink-0" unoptimized />
              ) : (
                <span className="w-6 h-6 rounded-sm bg-muted shrink-0" />
              )}
              <span className="truncate">{g.name}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
