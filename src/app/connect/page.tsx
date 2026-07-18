"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

interface Settings {
  connected: boolean;
  bggUsername: string | null;
  lastCollectionSync: string | null;
  lastGeeklistSync: string | null;
  thingiverseToken: string | null;
  cultsUsername: string | null;
  cultsApiKey: string | null;
  etsyApiKey: string | null;
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
  const [syncingGeeklist, setSyncingGeeklist] = useState(false);
  const [showReconnect, setShowReconnect] = useState(false);
  const [savingKeys, setSavingKeys] = useState(false);

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

  const handleSyncGeeklist = async () => {
    setSyncingGeeklist(true);
    try {
      const res = await fetch("/api/bgg/geeklist/import", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import failed.");
      toast.success(`Found ${data.created} new print${data.created === 1 ? "" : "s"} across ${data.itemsScanned} list entries.`);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setSyncingGeeklist(false);
    }
  };

  const setKey = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setSettings((s) => (s ? { ...s, [key]: value } : s));

  const handleSaveKeys = async () => {
    if (!settings) return;
    setSavingKeys(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thingiverseToken: settings.thingiverseToken,
          cultsUsername: settings.cultsUsername,
          cultsApiKey: settings.cultsApiKey,
          etsyApiKey: settings.etsyApiKey,
        }),
      });
      if (!res.ok) throw new Error("Couldn't save those keys.");
      toast.success("Search keys saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save those keys.");
    } finally {
      setSavingKeys(false);
    }
  };

  if (!settings) {
    return <div className="max-w-lg space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-32" /></div>;
  }

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
        <div className="space-y-4">
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

          <div className="rounded-lg border border-border bg-card p-4 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Community 3D-print index</p>
                <p className="text-xs text-muted-foreground">
                  Pulls known prints for your games from BGG&apos;s{" "}
                  <a
                    href="https://boardgamegeek.com/geeklist/186909/3d-prints-for-board-games"
                    target="_blank" rel="noopener noreferrer"
                    className="underline underline-offset-4"
                  >
                    3D Prints for Board Games
                  </a>{" "}
                  GeekList. Last synced: {formatDate(settings.lastGeeklistSync)}
                </p>
              </div>
              <Button variant="secondary" onClick={handleSyncGeeklist} disabled={syncingGeeklist} className="shrink-0">
                {syncingGeeklist ? "Importing…" : "Import"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              This can take a minute since the list is large and years old. Imported prints get a guessed title until you open one and click &quot;Fetch details.&quot;
            </p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <h2 className="font-display font-extrabold uppercase text-xl tracking-tight leading-none">Search API keys</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Add these to let Discover search a site automatically. Each is free and self-serve; Printables needs nothing and always works.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="thingiverse-token">Thingiverse app token</Label>
            <Input
              id="thingiverse-token"
              value={settings.thingiverseToken ?? ""}
              onChange={(e) => setKey("thingiverseToken", e.target.value)}
              placeholder="Paste your app token"
            />
            <p className="text-xs text-muted-foreground">
              Create a free app at{" "}
              <a href="https://www.thingiverse.com/apps/create" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                thingiverse.com/apps/create
              </a>{" "}
              and paste its App Token here.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cults-username">Cults3D username + API key</Label>
            <div className="flex gap-2">
              <Input
                id="cults-username"
                value={settings.cultsUsername ?? ""}
                onChange={(e) => setKey("cultsUsername", e.target.value)}
                placeholder="Your Cults handle"
                className="w-1/3"
              />
              <Input
                value={settings.cultsApiKey ?? ""}
                onChange={(e) => setKey("cultsApiKey", e.target.value)}
                placeholder="API key"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Generate a read-only key at{" "}
              <a href="https://cults3d.com/en/api/keys" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                cults3d.com/en/api/keys
              </a>.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="etsy-key">Etsy API key</Label>
            <Input
              id="etsy-key"
              value={settings.etsyApiKey ?? ""}
              onChange={(e) => setKey("etsyApiKey", e.target.value)}
              placeholder="Paste your keystring"
            />
            <p className="text-xs text-muted-foreground">
              Create a Personal App at{" "}
              <a href="https://www.etsy.com/developers" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                etsy.com/developers
              </a>. Approval usually takes a day or two.
            </p>
          </div>

          <Button onClick={handleSaveKeys} disabled={savingKeys} className="w-full">
            {savingKeys ? "Saving…" : "Save keys"}
          </Button>
        </div>
      </div>
    </div>
  );
}
