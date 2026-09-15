"use client";

import Image from "next/image";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusQuickSelect } from "@/components/status-quick-select";
import { RatingRow } from "@/components/rating-row";
import { PersonalRating } from "@/components/personal-rating";
import { typeLabel } from "@/lib/constants";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ProductCard({
  product,
  onClick,
  onStatusChange,
  animationDelayMs,
  selectMode,
  selected,
  onToggleSelect,
}: {
  product: Product;
  onClick: () => void;
  onStatusChange: (p: Product) => void;
  /** Staggers this card's entrance animation relative to its grid siblings. */
  animationDelayMs?: number;
  selectMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}) {
  const tags: string[] = product.tags ? JSON.parse(product.tags) : [];
  const handleClick = selectMode ? onToggleSelect ?? onClick : onClick;

  return (
    // A div, not a button: StatusQuickSelect below needs its own interactive
    // trigger, and a select/button can't nest inside a native <button>.
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleClick?.(); }
      }}
      style={animationDelayMs ? { animationDelay: `${animationDelayMs}ms` } : undefined}
      className={cn(
        "card-enter tick-corners group flex flex-col rounded-lg border bg-card overflow-hidden transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/60"
      )}
    >
      <div className="relative aspect-[4/3] bg-muted">
        {product.thumbnailUrl ? (
          <Image src={product.thumbnailUrl} alt="" fill className="object-cover" unoptimized />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs bed-grid">
            No image
          </div>
        )}
        <span className="absolute top-2 left-2 rounded-sm bg-popover/90 backdrop-blur px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wide text-popover-foreground ring-1 ring-foreground/10">
          {product.siteName ?? product.domain}
        </span>
        {selectMode && (
          <div
            className="absolute bottom-2 left-2 p-0.5 rounded-sm bg-popover/90 backdrop-blur ring-1 ring-foreground/10"
            onClick={(e) => e.stopPropagation()}
          >
            <Checkbox checked={!!selected} onCheckedChange={() => onToggleSelect?.()} />
          </div>
        )}
      </div>

      <div className="p-3 flex flex-col gap-1.5 flex-1">
        <p className="text-sm font-semibold leading-snug line-clamp-2">{product.title}</p>
        <div className="flex items-center gap-2">
          <RatingRow rating={product.siteRating} ratingCount={product.siteRatingCount} likesCount={product.siteLikesCount} />
          <PersonalRating value={product.rating} size="sm" />
        </div>

        <div className="flex flex-wrap gap-1">
          {product.games.slice(0, 3).map((g) => (
            <span key={g.id} className="text-[11px] px-1.5 py-0.5 rounded-full bg-secondary text-secondary-foreground">
              {g.name}
            </span>
          ))}
          {product.games.length > 3 && (
            <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-secondary text-secondary-foreground">
              +{product.games.length - 3}
            </span>
          )}
          {tags.map((t) => (
            <span key={t} className="text-[11px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
              {t}
            </span>
          ))}
        </div>

        <div className="mt-auto pt-2 flex items-center justify-between gap-2">
          <StatusQuickSelect product={product} onChanged={onStatusChange} />
          <span className="inline-flex items-center gap-1.5 font-mono text-xs font-medium">
            <span className={cn("size-2 rounded-full", product.isFree ? "bg-status-printed" : "bg-primary")} />
            {product.isFree ? "Free" : product.price != null ? `$${product.price.toFixed(2)}` : "—"}
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground font-mono">{typeLabel(product.type)}</span>
      </div>
    </div>
  );
}
