"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SITE_LABELS } from "@/lib/constants";

interface HiddenPrint {
  id: number;
  title: string;
  url: string;
  domain: string;
  siteName: string | null;
  game: { id: number; name: string };
}

export default function HiddenPage() {
  const [items, setItems] = useState<HiddenPrint[] | null>(null);
  const [unhiding, setUnhiding] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/catalog/hidden").then((r) => r.json()).then(setItems);
  }, []);

  const handleUnhide = async (id: number) => {
    setUnhiding(id);
    try {
      const res = await fetch("/api/catalog/unhide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Couldn't unhide that.");
      setItems((prev) => prev?.filter((i) => i.id !== id) ?? prev);
      toast.success("Back in Catalog.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't unhide that.");
    } finally {
      setUnhiding(null);
    }
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="font-display font-extrabold uppercase text-3xl tracking-tight leading-none">Hidden</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Prints dismissed as not relevant, or dropped automatically as a duplicate of a better-reviewed copy.
          Unhide one to bring it back into Catalog.
        </p>
      </div>

      {items === null && <p className="text-sm text-muted-foreground">Loading…</p>}

      {items !== null && items.length === 0 && (
        <p className="text-sm text-muted-foreground py-12 text-center">Nothing hidden right now.</p>
      )}

      {items !== null && items.length > 0 && (
        <div className="border border-border rounded-lg divide-y divide-border">
          {items.map((item) => (
            <div key={item.id} className="p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:text-primary line-clamp-1">
                  {item.title}
                </a>
                <p className="text-xs text-muted-foreground font-mono">
                  {item.siteName ?? SITE_LABELS[item.domain] ?? item.domain} · {item.game.name}
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                disabled={unhiding === item.id}
                onClick={() => handleUnhide(item.id)}
                className="shrink-0"
              >
                {unhiding === item.id ? "Unhiding…" : "Unhide"}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
