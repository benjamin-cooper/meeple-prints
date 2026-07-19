"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RatingRow } from "@/components/rating-row";
import { typeLabel } from "@/lib/constants";
import type { DiscoveredPrint, Product } from "@/lib/types";

/** A cached, not-yet-saved search hit shown in Catalog. Saving promotes it into a real Product. */
export function DiscoveredPrintCard({
  item,
  onSaved,
  onHidden,
}: {
  item: DiscoveredPrint;
  onSaved: (product: Product) => void;
  onHidden: (id: number) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [hiding, setHiding] = useState(false);

  const handleHide = async () => {
    setHiding(true);
    try {
      const res = await fetch("/api/catalog/hide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      });
      if (!res.ok) throw new Error("Couldn't hide that.");
      onHidden(item.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't hide that.");
      setHiding(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: item.url,
          title: item.title,
          thumbnailUrl: item.thumbnailUrl,
          domain: item.domain,
          siteName: item.siteName,
          creator: item.creator,
          price: item.price,
          currency: item.currency,
          isFree: item.isFree,
          siteRating: item.rating,
          siteRatingCount: item.ratingCount,
          siteLikesCount: item.likesCount,
          type: item.type,
          status: "wishlist",
          gameIds: [item.game.id],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't save that.");
      toast.success("Added to your catalog.");
      onSaved(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save that.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative flex flex-col rounded-lg border border-dashed border-border bg-card overflow-hidden">
      <a href={item.url} target="_blank" rel="noopener noreferrer" className="relative aspect-[4/3] bg-muted block">
        {item.thumbnailUrl ? (
          <Image src={item.thumbnailUrl} alt="" fill className="object-cover" unoptimized />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs bed-grid">
            No image
          </div>
        )}
        <span className="absolute top-2 left-2 rounded-sm bg-popover/90 backdrop-blur px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wide text-popover-foreground ring-1 ring-foreground/10">
          {item.siteName ?? item.domain}
        </span>
      </a>
      <button
        onClick={handleHide}
        disabled={hiding}
        title="Not relevant -- hide this"
        aria-label="Not relevant, hide this"
        className="absolute top-2 right-2 p-1 rounded-sm bg-popover/90 backdrop-blur text-popover-foreground ring-1 ring-foreground/10 hover:text-destructive disabled:opacity-50"
      >
        <X className="size-3" />
      </button>

      <div className="p-3 flex flex-col gap-1.5 flex-1">
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold leading-snug line-clamp-2 hover:text-primary">
          {item.title}
        </a>
        <RatingRow rating={item.rating} ratingCount={item.ratingCount} likesCount={item.likesCount} />

        <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-secondary text-secondary-foreground w-fit">
          {item.game.name}
        </span>

        <div className="mt-auto pt-2 flex items-center justify-between gap-2">
          <span className="font-mono text-xs font-medium text-status-printed">
            {item.isFree ? "Free" : item.price != null ? `$${item.price.toFixed(2)}` : "—"}
          </span>
          <Button size="sm" disabled={saving} onClick={handleSave}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
        <span className="text-[11px] text-muted-foreground font-mono">{typeLabel(item.type)}</span>
      </div>
    </div>
  );
}
