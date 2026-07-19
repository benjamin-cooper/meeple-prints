"use client";

import Image from "next/image";
import { StatusPill } from "@/components/status-pill";
import { RatingRow } from "@/components/rating-row";
import { typeLabel } from "@/lib/constants";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ProductCard({ product, onClick }: { product: Product; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group text-left flex flex-col rounded-lg border border-border bg-card overflow-hidden hover:border-primary/60 hover:shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
      </div>

      <div className="p-3 flex flex-col gap-1.5 flex-1">
        <p className="text-sm font-semibold leading-snug line-clamp-2">{product.title}</p>
        <RatingRow rating={product.siteRating} ratingCount={product.siteRatingCount} likesCount={product.siteLikesCount} />

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
        </div>

        <div className="mt-auto pt-2 flex items-center justify-between gap-2">
          <StatusPill status={product.status} />
          <span className={cn(
            "font-mono text-xs font-medium",
            product.isFree ? "text-status-printed" : "text-foreground"
          )}>
            {product.isFree ? "Free" : product.price != null ? `$${product.price.toFixed(2)}` : "—"}
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground font-mono">{typeLabel(product.type)}</span>
      </div>
    </button>
  );
}
