import type { Metadata } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { Nav } from "@/components/nav";
import "./globals.css";

// Self-hosted (not next/font/google) so the build never depends on fetching
// from Google Fonts -- that fetch has intermittently failed mid-build on
// Vercel for this project (a flaky "next/font/google queries have exactly
// one entry" / Module not found error, unrelated to any code change, hit
// twice in one week). Files in ./fonts are the same latin/normal woff2s
// Google serves, copied once from the @fontsource npm packages (a
// purpose-built self-hosted-Google-Fonts project) rather than fetched at
// build time.
const plexSans = localFont({
  variable: "--font-body",
  src: [
    { path: "./fonts/ibm-plex-sans-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/ibm-plex-sans-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/ibm-plex-sans-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/ibm-plex-sans-700.woff2", weight: "700", style: "normal" },
  ],
});

const plexMono = localFont({
  variable: "--font-mono",
  src: [
    { path: "./fonts/ibm-plex-mono-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/ibm-plex-mono-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/ibm-plex-mono-600.woff2", weight: "600", style: "normal" },
  ],
});

const bigShoulders = localFont({
  variable: "--font-display",
  src: [
    { path: "./fonts/big-shoulders-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/big-shoulders-700.woff2", weight: "700", style: "normal" },
    { path: "./fonts/big-shoulders-800.woff2", weight: "800", style: "normal" },
  ],
});

export const metadata: Metadata = {
  title: "Meeple Prints",
  description: "The 3D-printable accessories you've found for your board game shelf.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${plexSans.variable} ${plexMono.variable} ${bigShoulders.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground workshop-grid">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <Nav />
          <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 py-6">{children}</main>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
