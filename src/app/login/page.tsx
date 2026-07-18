"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password) { toast.error("Enter your BGG username and password."); return; }
    setLoggingIn(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Login failed.");
      window.location.href = "/";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed.");
      setLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background bed-grid">
      <div className="w-full max-w-sm space-y-6 p-6">
        <div className="text-center">
          <span className="font-display font-extrabold uppercase tracking-tight text-2xl leading-none text-foreground">
            Meeple<span className="text-primary">Prints</span>
          </span>
          <p className="text-sm text-muted-foreground mt-2">Sign in with your BoardGameGeek account.</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="bgg-username">BGG username</Label>
            <Input
              id="bgg-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bgg-password">BGG password</Label>
            <Input
              id="bgg-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Verified straight against BoardGameGeek. Only one account can sign in here.
          </p>
          <Button onClick={handleLogin} disabled={loggingIn} className="w-full">
            {loggingIn ? "Signing in…" : "Sign in"}
          </Button>
        </div>
      </div>
    </div>
  );
}
