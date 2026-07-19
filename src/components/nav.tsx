"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { LogOut, LogIn, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Catalog" },
  { href: "/games", label: "Games" },
  { href: "/search", label: "Search" },
  { href: "/connect", label: "Connect" },
];

export function Nav() {
  const pathname = usePathname();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session").then((r) => r.json()).then((d) => setSignedIn(d.signedIn));
  }, [pathname]);

  // Avoids a hydration mismatch: resolvedTheme is unknown on the server, so
  // the toggle icon can't render from it until after the client has mounted.
  // This is next-themes' own documented pattern for exactly this case.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  if (pathname === "/login") return null;

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <header className="border-b border-border bg-card/60 backdrop-blur sticky top-0 z-40">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span
            className="font-display font-extrabold uppercase tracking-tight text-xl leading-none text-foreground"
            style={{ fontStretch: "condensed" }}
          >
            Meeple<span className="text-primary">Prints</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          {LINKS.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                {link.label}
              </Link>
            );
          })}
          {mounted && (
            <button
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              aria-label={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary ml-1"
            >
              {resolvedTheme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
          )}
          {signedIn === false && (
            <Link
              href="/login"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary ml-1"
            >
              <LogIn className="size-4" /> Sign in
            </Link>
          )}
          {signedIn === true && (
            <button
              onClick={handleLogout}
              aria-label="Log out"
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary ml-1"
            >
              <LogOut className="size-4" />
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
