"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Settings {
  connected: boolean;
  bggUsername: string | null;
  lastCollectionSync: string | null;
  hasThingiverseToken: boolean;
  hasCultsCredentials: boolean;
  hasEtsyApiKey: boolean;
}

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
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [syncingCollection, setSyncingCollection] = useState(false);
  const [showReconnect, setShowReconnect] = useState(false);

  const refresh = () => fetch("/api/settings").then((r) => r.json()).then(setSettings);

  useEffect(() => { refresh(); }, []);

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
      toast.success(`Imported ${data.imported} game${data.imported === 1 ? "" : "s"}.`);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sync failed.");
    } finally {
      setSyncingCollection(false);
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

      {settings.connected && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Your collection</p>
              <p className="text-xs text-muted-foreground">Last synced: {formatDate(settings.lastCollectionSync)}</p>
            </div>
            <Button variant="secondary" onClick={handleSyncCollection} disabled={syncingCollection}>
              {syncingCollection ? "Syncing…" : "Sync now"}
            </Button>
          </div>
        </div>
      )}

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
                  {p.configured ? "Configured" : "Not configured"}
                </span>
              </div>
              {!p.configured && <p className="text-xs text-muted-foreground">{p.instructions}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
