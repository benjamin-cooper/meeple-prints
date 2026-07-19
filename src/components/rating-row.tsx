import { Heart } from "lucide-react";

interface Props {
  rating: number | null;
  ratingCount: number | null;
  likesCount: number | null;
}

/**
 * Site-sourced popularity metric, distinct from a saved Product's own
 * personal 1-5 usefulness rating. Only Printables has real star ratings;
 * Thingiverse and Cults3D only expose a like count, so this never fabricates
 * a rating for sites that don't have one.
 */
export function RatingRow({ rating, ratingCount, likesCount }: Props) {
  if (rating != null && ratingCount != null) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <span className="text-status-installed tracking-tight">{"★".repeat(Math.round(rating))}</span>
        <span>({ratingCount})</span>
      </span>
    );
  }
  if (likesCount != null) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <Heart className="size-3" />
        {likesCount}
      </span>
    );
  }
  return null;
}
