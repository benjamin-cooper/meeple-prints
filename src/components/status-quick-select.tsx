"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { PRODUCT_STATUSES, statusMeta } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/types";

const STATUS_ITEMS = Object.fromEntries(PRODUCT_STATUSES.map((s) => [s.value, s.label]));

/**
 * Inline status changer for cards/rows, so moving a print through
 * wishlist -> queued -> printed -> installed doesn't require opening the
 * full edit dialog. Stops its own clicks from bubbling since it always sits
 * inside a card/row that opens that dialog on click.
 */
export function StatusQuickSelect({
  product,
  onChanged,
  className,
}: {
  product: Product;
  onChanged: (p: Product) => void;
  className?: string;
}) {
  const [saving, setSaving] = useState(false);
  const meta = statusMeta(product.status);

  const handleChange = async (status: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't update status.");
      onChanged(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update status.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={className}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <Select items={STATUS_ITEMS} value={product.status} onValueChange={(v) => handleChange(v as string)} disabled={saving}>
        <SelectTrigger className="h-6 w-fit gap-1 rounded-full border-none bg-transparent px-1.5 py-0 text-xs font-medium hover:bg-secondary disabled:opacity-60">
          <span className={cn("w-2 h-2 rounded-full shrink-0", meta.swatch)} aria-hidden />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PRODUCT_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
