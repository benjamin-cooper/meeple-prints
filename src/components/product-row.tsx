"use client";

import Image from "next/image";
import { StatusQuickSelect } from "@/components/status-quick-select";
import { typeLabel } from "@/lib/constants";
import type { Product } from "@/lib/types";

export function ProductRow({
  product,
  onClick,
  onStatusChange,
}: {
  product: Product;
  onClick: () => void;
  onStatusChange: (p: Product) => void;
}) {
  const tags: string[] = product.tags ? JSON.parse(product.tags) : [];

  return (
    <tr onClick={onClick} className="cursor-pointer hover:bg-secondary/60 border-b border-border last:border-0">
      <td className="py-1.5 pl-3 pr-2 w-12">
        <div className="relative w-9 h-9 rounded-sm overflow-hidden bg-muted shrink-0">
          {product.thumbnailUrl && <Image src={product.thumbnailUrl} alt="" fill className="object-cover" unoptimized />}
        </div>
      </td>
      <td className="py-1.5 pr-3 max-w-[280px]">
        <p className="text-sm font-medium truncate">{product.title}</p>
        <p className="text-xs text-muted-foreground font-mono truncate">{product.domain}</p>
      </td>
      <td className="py-1.5 pr-3 text-sm max-w-[220px]">
        <span className="truncate block text-muted-foreground">
          {product.games.map((g) => g.name).join(", ") || "—"}
        </span>
      </td>
      <td className="py-1.5 pr-3 text-xs font-mono text-muted-foreground whitespace-nowrap">{typeLabel(product.type)}</td>
      <td className="py-1.5 pr-3 whitespace-nowrap">
        <StatusQuickSelect product={product} onChanged={onStatusChange} />
      </td>
      <td className="py-1.5 pr-3 text-sm font-mono whitespace-nowrap">
        {product.isFree ? <span className="text-status-printed">Free</span> : product.price != null ? `$${product.price.toFixed(2)}` : "—"}
      </td>
      <td className="py-1.5 pr-3 text-sm whitespace-nowrap">
        {product.rating ? "★".repeat(product.rating) : <span className="text-muted-foreground">—</span>}
      </td>
      <td className="py-1.5 pr-3 text-xs max-w-[180px]">
        <span className="truncate block text-muted-foreground">
          {tags.join(", ") || "—"}
        </span>
      </td>
    </tr>
  );
}
