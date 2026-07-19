"use client";

import { cn } from "@/lib/utils";

interface Props {
  value: number | null;
  onChange?: (value: number | null) => void;
  size?: "sm" | "md";
}

/** Your own 1-5 usefulness rating for a saved print -- distinct from RatingRow's site-sourced numbers. */
export function PersonalRating({ value, onChange, size = "md" }: Props) {
  const starClass = size === "sm" ? "text-xs" : "text-lg";

  if (!onChange) {
    if (!value) return null;
    return (
      <span className={cn("inline-flex text-status-installed tracking-tight", starClass)} title="Your rating">
        {"★".repeat(value)}
      </span>
    );
  }

  return (
    <div className={cn("inline-flex items-center gap-0.5", starClass)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(value === n ? null : n)}
          className={cn(
            "leading-none hover:scale-110 transition-transform",
            n <= (value ?? 0) ? "text-status-installed" : "text-muted-foreground/30 hover:text-status-installed/60"
          )}
          aria-label={`Rate ${n} star${n === 1 ? "" : "s"}`}
          aria-pressed={value === n}
        >
          ★
        </button>
      ))}
      {value != null && (
        <button type="button" onClick={() => onChange(null)} className="ml-1 text-[11px] text-muted-foreground hover:text-foreground">
          Clear
        </button>
      )}
    </div>
  );
}
