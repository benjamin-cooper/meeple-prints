"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { typeLabel } from "@/lib/constants";
import type { ProviderResult } from "@/lib/providers/types";
import type { Product } from "@/lib/types";

interface Props {
  result: ProviderResult & { alreadySaved: boolean };
  domain: string;
  siteName: string;
  type: string;
  gameId: number;
  onSaved: (product: Product) => void;
}

export function SearchResultCard({ result, domain, siteName, type, gameId, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(result.alreadySaved);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: result.url,
          title: result.title,
          thumbnailUrl: result.thumbnailUrl,
          domain,
          siteName,
          creator: result.creator,
          price: result.price,
          currency: result.currency,
          isFree: result.isFree,
          type,
          status: "wishlist",
          gameIds: [gameId],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't save that.");
      toast.success("Added to your catalog.");
      setSaved(true);
      onSaved(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save that.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col rounded-lg border border-border bg-card overflow-hidden">
      <a href={result.url} target="_blank" rel="noopener noreferrer" className="relative aspect-[4/3] bg-muted block">
        {result.thumbnailUrl ? (
          <Image src={result.thumbnailUrl} alt="" fill className="object-cover" unoptimized />
        ) : (
          <div className="w-full h-full bed-grid" />
        )}
        <span className="absolute top-2 left-2 rounded-sm bg-popover/90 backdrop-blur px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wide text-popover-foreground ring-1 ring-foreground/10">
          {siteName}
        </span>
      </a>
      <div className="p-2.5 flex flex-col gap-1.5 flex-1">
        <a href={result.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium leading-snug line-clamp-2 hover:text-primary">
          {result.title}
        </a>
        {result.creator && <p className="text-xs text-muted-foreground truncate">by {result.creator}</p>}
        <div className="mt-auto pt-1.5 flex items-center justify-between gap-2">
          <span className="font-mono text-xs font-medium text-status-printed">
            {result.isFree ? "Free" : result.price != null ? `$${result.price.toFixed(2)}` : "—"}
          </span>
          <Button size="sm" variant={saved ? "secondary" : "default"} disabled={saved || saving} onClick={handleSave}>
            {saved ? "Saved" : saving ? "Saving…" : "Save"}
          </Button>
        </div>
        <span className="text-[11px] text-muted-foreground font-mono">{typeLabel(type)}</span>
      </div>
    </div>
  );
}
