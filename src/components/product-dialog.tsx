"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { GamePicker } from "@/components/game-picker";
import { PersonalRating } from "@/components/personal-rating";
import { PRODUCT_TYPES, PRODUCT_STATUSES } from "@/lib/constants";
import type { GameSummary, Product } from "@/lib/types";

interface ProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  games: GameSummary[];
  product?: Product | null;
  defaultGameId?: number;
  onSaved: (product: Product) => void;
  onDeleted?: (productId: number) => void;
}

interface FormState {
  url: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  domain: string;
  siteName: string;
  type: string;
  creator: string;
  price: string;
  isFree: boolean;
  status: string;
  rating: number | null;
  notes: string;
  tags: string;
  gameIds: number[];
}

// Base UI's <Select.Value> only knows an item's label once the popup has
// mounted, unless the root is given a value->label map up front.
const TYPE_ITEMS = Object.fromEntries(PRODUCT_TYPES.map((t) => [t.value, t.label]));
const STATUS_ITEMS = Object.fromEntries(PRODUCT_STATUSES.map((s) => [s.value, s.label]));

function buildInitialForm(product: Product | null | undefined, defaultGameId?: number): FormState {
  if (product) {
    return {
      url: product.url,
      title: product.title,
      description: product.description ?? "",
      thumbnailUrl: product.thumbnailUrl ?? "",
      domain: product.domain,
      siteName: product.siteName ?? "",
      type: product.type,
      creator: product.creator ?? "",
      price: product.price != null ? String(product.price) : "",
      isFree: product.isFree,
      status: product.status,
      rating: product.rating,
      notes: product.notes ?? "",
      tags: product.tags ? (JSON.parse(product.tags) as string[]).join(", ") : "",
      gameIds: product.games.map((g) => g.id),
    };
  }
  return {
    url: "", title: "", description: "", thumbnailUrl: "", domain: "", siteName: "",
    type: "other", creator: "", price: "", isFree: false, status: "wishlist",
    rating: null, notes: "", tags: "", gameIds: defaultGameId ? [defaultGameId] : [],
  };
}

/**
 * Owns the form's local state, keyed by the parent so a fresh instance
 * (and fresh initial state) mounts every time a different product, or a
 * brand new "add", is opened, instead of syncing state via an effect.
 */
function ProductForm({
  product, games, defaultGameId, onOpenChange, onSaved, onDeleted,
}: Omit<ProductDialogProps, "open">) {
  const [form, setForm] = useState<FormState>(() => buildInitialForm(product, defaultGameId));
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [fetched, setFetched] = useState(!!product);

  const isEdit = !!product;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleFetch = async () => {
    if (!form.url.trim()) {
      toast.error("Paste a link first.");
      return;
    }
    setFetching(true);
    try {
      const res = await fetch("/api/unfurl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: form.url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't read that page.");
      setForm((f) => ({
        ...f,
        title: data.title ?? f.title,
        description: data.description ?? f.description,
        thumbnailUrl: data.thumbnailUrl ?? f.thumbnailUrl,
        domain: data.domain,
        siteName: data.siteName,
        isFree: data.isFreeDefault,
      }));
      setFetched(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't read that page.");
    } finally {
      setFetching(false);
    }
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error("Give it a title."); return; }
    if (form.gameIds.length === 0) { toast.error("Attach at least one game."); return; }

    setSaving(true);
    try {
      const tags = form.tags.trim() ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
      const payload = {
        url: form.url.trim(),
        title: form.title.trim(),
        description: form.description.trim() || null,
        thumbnailUrl: form.thumbnailUrl || null,
        domain: form.domain || new URL(form.url).hostname.replace(/^www\./, ""),
        siteName: form.siteName || null,
        type: form.type,
        creator: form.creator.trim() || null,
        price: form.price === "" ? null : Number(form.price),
        isFree: form.isFree,
        status: form.status,
        rating: form.rating,
        notes: form.notes.trim() || null,
        tags: tags.length ? tags : null,
        gameIds: form.gameIds,
      };

      const res = await fetch(isEdit ? `/api/products/${product!.id}` : "/api/products", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't save that.");

      toast.success(isEdit ? "Saved." : "Added to your catalog.");
      onSaved(data);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save that.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!product) return;
    if (!window.confirm(`Remove "${product.title}" from your catalog?`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/products/${product.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Couldn't remove that.");
      toast.success("Removed.");
      onDeleted?.(product.id);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't remove that.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit print" : "Add a print"}</DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="url">Link</Label>
          <div className="flex gap-2">
            <Input
              id="url"
              readOnly={isEdit}
              placeholder="https://www.thingiverse.com/thing/…"
              value={form.url}
              onChange={(e) => { set("url", e.target.value); setFetched(false); }}
              className={isEdit ? "bg-muted text-muted-foreground" : undefined}
            />
            <Button type="button" variant="secondary" onClick={handleFetch} disabled={fetching}>
              {fetching ? "Reading…" : "Fetch details"}
            </Button>
          </div>
          {!fetched && (
            <p className="text-xs text-muted-foreground">
              Fetch pulls the title, image, and description from the page. You can also fill these in yourself below.
            </p>
          )}
        </div>

        {form.thumbnailUrl && (
          <div className="relative w-full h-40 rounded-md overflow-hidden border border-border bg-muted">
            <Image src={form.thumbnailUrl} alt="" fill className="object-cover" unoptimized />
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={form.title} onChange={(e) => set("title", e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select items={TYPE_ITEMS} value={form.type} onValueChange={(v) => set("type", v as string)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRODUCT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select items={STATUS_ITEMS} value={form.status} onValueChange={(v) => set("status", v as string)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRODUCT_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 items-end">
          <div className="space-y-1.5">
            <Label htmlFor="price">Price (USD)</Label>
            <Input
              id="price" type="number" min="0" step="0.01"
              placeholder="0.00" value={form.price}
              disabled={form.isFree}
              onChange={(e) => set("price", e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 pb-2 text-sm cursor-pointer">
            <Checkbox checked={form.isFree} onCheckedChange={(c) => set("isFree", !!c)} />
            Free
          </label>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="creator">Designer / maker</Label>
          <Input id="creator" value={form.creator} onChange={(e) => set("creator", e.target.value)} placeholder="Optional" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notes">Your notes</Label>
          <Textarea id="notes" rows={2} placeholder="Print settings, supports needed, how it turned out…" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Your rating</Label>
            <PersonalRating value={form.rating} onChange={(v) => set("rating", v)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tags">Tags</Label>
            <Input id="tags" placeholder="quick-print, painted" value={form.tags} onChange={(e) => set("tags", e.target.value)} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Games</Label>
          <GamePicker games={games} selectedIds={form.gameIds} onChange={(ids) => set("gameIds", ids)} />
        </div>
      </div>

      <DialogFooter className={isEdit ? "sm:justify-between" : undefined}>
        {isEdit && (
          <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Removing…" : "Remove from catalog"}
          </Button>
        )}
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : isEdit ? "Save changes" : "Add to catalog"}</Button>
        </div>
      </DialogFooter>
    </>
  );
}

export function ProductDialog({ open, onOpenChange, games, product, defaultGameId, onSaved, onDeleted }: ProductDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <ProductForm
          key={`${product?.id ?? "new"}-${defaultGameId ?? "none"}-${open ? "o" : "c"}`}
          product={product}
          games={games}
          defaultGameId={defaultGameId}
          onOpenChange={onOpenChange}
          onSaved={onSaved}
          onDeleted={onDeleted}
        />
      </DialogContent>
    </Dialog>
  );
}
