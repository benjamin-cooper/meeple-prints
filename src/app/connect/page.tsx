"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { cn, timeAgo } from "@/lib/utils";

interface Settings {
  connected: boolean;
  bggUsername: string | null;
  lastCollectionSync: string | null;
  lastCronRunAt: string | null;
  hasThingiverseToken: boolean;
  hasCultsCredentials: boolean;
  hasEtsyApiKey: boolean;
}

interface DroppedGame {
  id: number;
  name: string;
  productCount: number;
}

const CRON_STALE_AFTER_MS = 30 * 60 * 60 * 1000; // 30h -- a day plus a buffer for a slow run

interface ProviderEnvStatus {
  label: string;
  configured: boolean;
  envVars: string;
  instructions: React.ReactNode;
}

function formatDate(iso: string | null) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default function ConnectPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [syncingCollection, setSyncingCollection] = useState(false);
  const [showReconnect, setShowReconnect] = useState(false);
  const [droppedGames, setDroppedGames] = useState<DroppedGame[]>([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [selectedDropped, setSelectedDropped] = useState<Set<number>>(new Set());
  const [deletingDropped, setDeletingDropped] = useState(false);

  const refresh = () => fetch("/api/settings").then((r) => r.json()).then(setSettings);

  useEffect(() => { refresh(); }, []);
  // Date.now() can't be called during render (impure); read it once after mount instead.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setNow(Date.now()), []);

  const handleLogin = async () => {
    if (!username.trim() || !password) { toast.error("Enter your BGG username and password."); return; }
    setLoggingIn(true);
    try {
      const res = await fetch("/api/bgg/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Login failed.");
      toast.success(`Connected as ${data.username}.`);
      setPassword("");
      setShowReconnect(false);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoggingIn(false);
    }
  };

  const handleSyncCollection = async () => {
    setSyncingCollection(true);
    try {
      const res = await fetch("/api/bgg/collection/import", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Sync failed.");
      const scanNote = data.newGames > 0 ? `, scanned ${data.scanned} of ${data.newGames} new game${data.newGames === 1 ? "" : "s"}` : "";
      const dropped: DroppedGame[] = data.droppedGames ?? [];
      toast.success(`Imported ${data.imported} game${data.imported === 1 ? "" : "s"}${scanNote}.`, dropped.length > 0 ? {
        action: {
          label: `Review ${dropped.length} removed`,
          onClick: () => {
            setDroppedGames(dropped);
            setSelectedDropped(new Set());
            setReviewOpen(true);
          },
        },
      } : undefined);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sync failed.");
    } finally {
      setSyncingCollection(false);
    }
  };

  const toggleDropped = (id: number) => {
    setSelectedDropped((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleDeleteSelectedDropped = async () => {
    const ids = Array.from(selectedDropped);
    if (ids.length === 0) return;
    setDeletingDropped(true);
    try {
      const results = await Promise.allSettled(
        ids.map((id) => fetch(`/api/games/${id}`, { method: "DELETE" }).then((r) => {
          if (!r.ok) throw new Error();
          return id;
        }))
      );
      const succeeded = new Set(
        results.filter((r): r is PromiseFulfilledResult<number> => r.status === "fulfilled").map((r) => r.value)
      );
      setDroppedGames((prev) => prev.filter((g) => !succeeded.has(g.id)));
      setSelectedDropped(new Set());
      toast.success(`Deleted ${succeeded.size} game${succeeded.size === 1 ? "" : "s"} permanently.`);
      if (succeeded.size === ids.length) setReviewOpen(false);
    } finally {
      setDeletingDropped(false);
    }
  };

  if (!settings) {
    return <div className="max-w-lg space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-32" /></div>;
  }

  const providerStatuses: ProviderEnvStatus[] = [
    {
      label: "Thingiverse",
      configured: settings.hasThingiverseToken,
      envVars: "THINGIVERSE_TOKEN",
      instructions: (
        <>
          Create a free app at{" "}
          <a href="https://www.thingiverse.com/apps/create" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
            thingiverse.com/apps/create
          </a>{" "}
          and set its App Token as <code className="font-mono">THINGIVERSE_TOKEN</code>.
        </>
      ),
    },
    {
      label: "Cults3D",
      configured: settings.hasCultsCredentials,
      envVars: "CULTS_USERNAME, CULTS_API_KEY",
      instructions: (
        <>
          Generate a read-only key at{" "}
          <a href="https://cults3d.com/en/api/keys" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
            cults3d.com/en/api/keys
          </a>{" "}
          and set your handle as <code className="font-mono">CULTS_USERNAME</code> and the key as <code className="font-mono">CULTS_API_KEY</code>.
        </>
      ),
    },
    {
      label: "Etsy",
      configured: settings.hasEtsyApiKey,
      envVars: "ETSY_KEYSTRING, ETSY_SHARED_SECRET",
      instructions: (
        <>
          Create a Personal App at{" "}
          <a href="https://www.etsy.com/developers" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
            etsy.com/developers
          </a>{" "}
          (approval usually takes a day or two) and set its Keystring as <code className="font-mono">ETSY_KEYSTRING</code>{" "}
          and Shared Secret as <code className="font-mono">ETSY_SHARED_SECRET</code>.
        </>
      ),
    },
  ];

  return (
    <div className="max-w-lg space-y-8">
      <div>
        <h1 className="font-display font-extrabold uppercase text-3xl tracking-tight leading-none">Connect</h1>
        <p className="text-sm text-muted-foreground mt-1">Link your BoardGameGeek account to pull in your collection.</p>
      </div>

      {settings.connected && !showReconnect ? (
        <div className="rounded-lg border border-border bg-card p-4 space-y-1">
          <p className="text-sm">
            Connected as <span className="font-semibold font-mono">{settings.bggUsername}</span>
          </p>
          <button className="text-xs text-muted-foreground underline underline-offset-4" onClick={() => setShowReconnect(true)}>
            Use a different account
          </button>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="bgg-username">BGG username</Label>
            <Input id="bgg-username" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bgg-password">BGG password</Label>
            <Input id="bgg-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </div>
          <p className="text-xs text-muted-foreground">
            This goes straight to BoardGameGeek to open a session. Only the session token is stored here, not your password.
          </p>
          <Button onClick={handleLogin} disabled={loggingIn} className="w-full">{loggingIn ? "Connecting…" : "Connect"}</Button>
        </div>
      )}

      {settings.connected && now !== null && (() => {
        const isStale = !settings.lastCollectionSync
          || now - new Date(settings.lastCollectionSync).getTime() > CRON_STALE_AFTER_MS;
        return (
          <div className="rounded-lg border border-border bg-card p-4 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">Your collection</p>
              <span className={cn(
                "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
                isStale ? "bg-destructive/10 text-destructive" : "bg-status-printed/15 text-status-printed"
              )}>
                {isStale ? <X className="size-3" /> : <Check className="size-3" />}
                {isStale ? "Stale" : "Up to date"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">Last synced: {formatDate(settings.lastCollectionSync)}</p>
              <Button variant="secondary" size="sm" onClick={handleSyncCollection} disabled={syncingCollection}>
                {syncingCollection ? "Syncing…" : "Sync now"}
              </Button>
            </div>
            {isStale && (
              <p className="text-xs text-muted-foreground">
                Synced automatically once a day alongside the auto-scan below, so this should rarely go stale
                on its own -- if it does, it likely means your BGG session expired. Reconnecting above will fix it.
              </p>
            )}
          </div>
        );
      })()}

      {settings.connected && now !== null && (() => {
        const isStale = !settings.lastCronRunAt
          || now - new Date(settings.lastCronRunAt).getTime() > CRON_STALE_AFTER_MS;
        return (
          <div className="rounded-lg border border-border bg-card p-4 space-y-1">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">Auto-scan</p>
              <span className={cn(
                "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
                isStale ? "bg-destructive/10 text-destructive" : "bg-status-printed/15 text-status-printed"
              )}>
                {isStale ? <X className="size-3" /> : <Check className="size-3" />}
                {isStale ? "Not running" : "Running"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Last daily sweep: {timeAgo(settings.lastCronRunAt, now)}</p>
            {isStale && (
              <p className="text-xs text-muted-foreground">
                Expected once a day. Check that <code className="font-mono">CRON_SECRET</code>{" "}
                is set in your hosting provider&apos;s environment variables and that the cron job is enabled.
              </p>
            )}
          </div>
        );
      })()}

      <div className="space-y-3">
        <div>
          <h2 className="font-display font-extrabold uppercase text-xl tracking-tight leading-none">Search sites</h2>
          <p className="text-sm text-muted-foreground mt-1">
            These are set as environment variables on wherever this is hosted, not from this page.
            That way there&apos;s one source of truth instead of a database row that can drift from
            what&apos;s actually deployed. Printables needs nothing and always works.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card divide-y divide-border">
          {providerStatuses.map((p) => (
            <div key={p.label} className="p-4 space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">{p.label}</span>
                <span className={cn(
                  "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
                  p.configured ? "bg-status-printed/15 text-status-printed" : "bg-muted text-muted-foreground"
                )}>
                  {p.configured ? <Check className="size-3" /> : <X className="size-3" />}
                  {p.configured ? "Configured" : "Not Configured"}
                </span>
              </div>
              {!p.configured && <p className="text-xs text-muted-foreground">{p.instructions}</p>}
            </div>
          ))}
        </div>
      </div>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Removed from your BGG collection</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              These are kept, not deleted, by default -- any prints saved against them stay safe. Check any you
              want gone permanently, prints and all.
            </p>
            <div className="border border-border rounded-lg divide-y divide-border max-h-64 overflow-y-auto">
              {droppedGames.map((g) => (
                <label key={g.id} className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-secondary text-sm">
                  <Checkbox checked={selectedDropped.has(g.id)} onCheckedChange={() => toggleDropped(g.id)} />
                  <span className="flex-1 truncate">{g.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {g.productCount} print{g.productCount === 1 ? "" : "s"}
                  </span>
                </label>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewOpen(false)}>
              {selectedDropped.size > 0 ? "Keep the rest" : "Close"}
            </Button>
            <Button
              variant="destructive"
              disabled={selectedDropped.size === 0 || deletingDropped}
              onClick={handleDeleteSelectedDropped}
            >
              {deletingDropped ? "Deleting…" : `Delete ${selectedDropped.size || ""} permanently`.trim()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
