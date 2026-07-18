"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Catalog" },
  { href: "/games", label: "Games" },
  { href: "/discover", label: "Discover" },
  { href: "/connect", label: "Connect" },
];

export function Nav() {
  const pathname = usePathname();

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
          <button
            onClick={handleLogout}
            aria-label="Log out"
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary ml-1"
          >
            <LogOut className="size-4" />
          </button>
        </nav>
      </div>
    </header>
  );
}
