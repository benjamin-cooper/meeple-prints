"use client";

import { Suspense, useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Search, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { SITE_LABELS, HIDE_REASONS, hideReasonLabel } from "@/lib/constants";
import { HIDE_REASON_ICONS } from "@/lib/hide-reason-icons";
import { cn } from "@/lib/utils";

type AutoExplanation = "collision" | "not-3d-print" | "duplicate" | null;

const AUTO_EXPLANATION_LABELS: Record<Exclude<AutoExplanation, null>, string> = {
  collision: "Collision rule",
  "not-3d-print": "Content-type rule",
  duplicate: "Duplicate rule",
};

interface HiddenPrint {
  id: number;
  title: string;
  url: string;
  domain: string;
  siteName: string | null;
  hideReason: string | null;
  autoExplanation: AutoExplanation;
  game: { id: number; name: string };
}

export default function HiddenPage() {
  return (
    <Suspense>
      <HiddenPageContent />
    </Suspense>
  );
}

function HiddenPageContent() {
  const searchParams = useSearchParams();
  const [items, setItems] = useState<HiddenPrint[] | null>(null);
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [reasonFilter, setReasonFilter] = useState<string>("all");
  const [coverageFilter, setCoverageFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [unhiding, setUnhiding] = useState<number | "bulk" | null>(null);

  useEffect(() => {
    fetch("/api/catalog/hidden").then((r) => r.json()).then(setItems);
  }, []);

  const needsReviewCount = useMemo(
    () => items?.filter((i) => !i.autoExplanation).length ?? 0,
    [items]
  );

  const filtered = useMemo(() => {
    if (!items) return [];
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      if (reasonFilter !== "all" && (i.hideReason ?? "unlabeled") !== reasonFilter) return false;
      if (coverageFilter === "needs-review" && i.autoExplanation) return false;
      if (coverageFilter !== "all" && coverageFilter !== "needs-review" && i.autoExplanation !== coverageFilter) return false;
      if (q && !i.title.toLowerCase().includes(q) && !i.game.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, query, reasonFilter, coverageFilter]);

  const reasonItems = {
    all: "All reasons",
    ...Object.fromEntries(HIDE_REASONS.map((r) => [r.value, r.label])),
    unlabeled: "Unlabeled",
  };

  const coverageItems = {
    all: "All",
    "needs-review": "Needs review",
    ...AUTO_EXPLANATION_LABELS,
  };

  const unhideIds = async (ids: number[]) => {
    const results = await Promise.allSettled(
      ids.map((id) =>
        fetch("/api/catalog/unhide", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        }).then((res) => {
          if (!res.ok) throw new Error();
          return id;
        })
      )
    );
    const succeeded = new Set(
      results.filter((r): r is PromiseFulfilledResult<number> => r.status === "fulfilled").map((r) => r.value)
    );
    if (succeeded.size > 0) {
      setItems((prev) => prev?.filter((i) => !succeeded.has(i.id)) ?? prev);
      setSelected((prev) => {
        const next = new Set(prev);
        succeeded.forEach((id) => next.delete(id));
        return next;
      });
    }
    return succeeded.size;
  };

  const handleUnhide = async (id: number) => {
    setUnhiding(id);
    try {
      const count = await unhideIds([id]);
      if (count === 0) throw new Error();
      toast.success("Back in Catalog.");
    } catch {
      toast.error("Couldn't unhide that.");
    } finally {
      setUnhiding(null);
    }
  };

  const handleUnhideSelected = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setUnhiding("bulk");
    try {
      const count = await unhideIds(ids);
      toast.success(`${count} back in Catalog${count < ids.length ? ` (${ids.length - count} failed)` : ""}.`);
    } finally {
      setUnhiding(null);
    }
  };

  const toggleSelected = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const allVisibleSelected = filtered.length > 0 && filtered.every((i) => selected.has(i.id));
  const toggleSelectAll = () => {
    setSelected((prev) => {
      if (allVisibleSelected) {
        const next = new Set(prev);
        filtered.forEach((i) => next.delete(i.id));
        return next;
      }
      return new Set([...prev, ...filtered.map((i) => i.id)]);
    });
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="font-display font-extrabold uppercase text-3xl tracking-tight leading-none">Hidden</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Prints dismissed as not relevant, or dropped automatically as a duplicate of a better-reviewed copy.
          Unhide one to bring it back into Catalog.
          {items !== null && items.length > 0 && (
            <>
              {" "}
              {needsReviewCount > 0 ? (
                <span className="text-destructive font-medium">
                  {needsReviewCount} of {items.length} have no rule explaining them yet -- worth a look for a new pattern.
                </span>
              ) : (
                "Every hidden print is already explained by a shipped rule."
              )}
            </>
          )}
        </p>
      </div>

      {items === null && <p className="text-sm text-muted-foreground">Loading…</p>}

      {items !== null && items.length === 0 && (
        <p className="text-sm text-muted-foreground py-12 text-center">Nothing hidden right now.</p>
      )}

      {items !== null && items.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[160px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search hidden prints…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select items={reasonItems} value={reasonFilter} onValueChange={(v) => setReasonFilter(v as string)}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="All reasons" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All reasons</SelectItem>
                {HIDE_REASONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                <SelectItem value="unlabeled">Unlabeled</SelectItem>
              </SelectContent>
            </Select>
            <Select items={coverageItems} value={coverageFilter} onValueChange={(v) => setCoverageFilter(v as string)}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="needs-review">Needs review</SelectItem>
                {Object.entries(AUTO_EXPLANATION_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="secondary"
              disabled={selected.size === 0 || unhiding === "bulk"}
              onClick={handleUnhideSelected}
            >
              {unhiding === "bulk" ? "Unhiding…" : `Unhide ${selected.size || ""}`.trim()}
            </Button>
          </div>

          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No hidden prints match &quot;{query}&quot;.</p>
          ) : (
            <div className="border border-border rounded-lg divide-y divide-border">
              <label className="p-3 flex items-center gap-3 cursor-pointer text-xs text-muted-foreground">
                <Checkbox checked={allVisibleSelected} onCheckedChange={toggleSelectAll} />
                Select all {filtered.length !== items.length && `(${filtered.length} shown)`}
              </label>
              {filtered.map((item) => (
                <div key={item.id} className="p-3 flex items-center gap-3">
                  <Checkbox checked={selected.has(item.id)} onCheckedChange={() => toggleSelected(item.id)} />
                  <div className="min-w-0 flex-1">
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:text-primary line-clamp-1">
                      {item.title}
                    </a>
                    <p className="text-xs text-muted-foreground font-mono">
                      {item.siteName ?? SITE_LABELS[item.domain] ?? item.domain} · {item.game.name}
                    </p>
                  </div>
                  {item.hideReason && (() => {
                    const Icon = HIDE_REASON_ICONS[item.hideReason];
                    return (
                      <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-mono px-1.5 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                        {Icon && <Icon className="size-3" />} {hideReasonLabel(item.hideReason)}
                      </span>
                    );
                  })()}
                  {item.autoExplanation ? (
                    <span
                      title="A shipped rule already covers this -- it won't come back on its own."
                      className="shrink-0 text-[11px] font-mono px-1.5 py-0.5 rounded-full bg-status-printed/10 text-status-printed"
                    >
                      {AUTO_EXPLANATION_LABELS[item.autoExplanation]}
                    </span>
                  ) : (
                    <span
                      title="No shipped rule explains this yet -- it could come back on a future scan."
                      className={cn(
                        "shrink-0 inline-flex items-center gap-1 text-[11px] font-mono px-1.5 py-0.5 rounded-full",
                        "bg-destructive/10 text-destructive"
                      )}
                    >
                      <TriangleAlert className="size-3" /> Needs review
                    </span>
                  )}
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
        </>
      )}
    </div>
  );
}
