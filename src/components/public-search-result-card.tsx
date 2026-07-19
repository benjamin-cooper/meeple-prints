import Image from "next/image";
import { RatingRow } from "@/components/rating-row";
import { typeLabel } from "@/lib/constants";
import { guessTypeFromTitle } from "@/lib/providers/guess-type";
import type { ProviderResult } from "@/lib/providers/types";

/** Read-only result card for the public search tool: no save action, no game context. */
export function PublicSearchResultCard({ result, siteName }: { result: ProviderResult; siteName: string }) {
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
      </div>
    </div>
  );
}
