import { statusMeta } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function StatusPill({ status, className }: { status: string; className?: string }) {
  const meta = statusMeta(status);
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium text-foreground", className)}>
      <span className={cn("w-2 h-2 rounded-full shrink-0", meta.swatch)} aria-hidden />
      {meta.label}
    </span>
  );
}
