import Image from "next/image";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RatingRow } from "@/components/rating-row";
import { typeLabel } from "@/lib/constants";
import { guessTypeFromTitle } from "@/lib/providers/guess-type";
import type { ProviderResult } from "@/lib/providers/types";

interface PublicSearchResultCardProps {
  result: ProviderResult;
  siteName: string;
  /** Omit to render read-only (no save button) -- kept optional so this card has no hard dependency on a catalog to save into. */
  onAdd?: () => void;
  alreadySaved?: boolean;
}

export function PublicSearchResultCard({ result, siteName, onAdd, alreadySaved }: PublicSearchResultCardProps) {
  const type = guessTypeFromTitle(result.title);

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
        <RatingRow rating={result.rating} ratingCount={result.ratingCount} likesCount={result.likesCount} />
        <div className="mt-auto pt-1.5 flex items-center justify-between gap-2">
          <span className="font-mono text-xs font-medium text-status-printed">
            {result.isFree ? "Free" : result.price != null ? `$${result.price.toFixed(2)}` : "—"}
          </span>
          <span className="text-[11px] text-muted-foreground font-mono">{typeLabel(type)}</span>
        </div>
        {onAdd && (
          <Button size="sm" variant={alreadySaved ? "secondary" : "default"} className="gap-1.5" disabled={alreadySaved} onClick={onAdd}>
            <Plus className="size-3.5" /> {alreadySaved ? "In catalog" : "Add to catalog"}
          </Button>
        )}
      </div>
    </div>
  );
}
