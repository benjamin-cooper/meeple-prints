# Meeple Prints

A catalog for the 3D-printable accessories you've found for your board game shelf: inserts, organizers, miniature proxies, terrain, tokens. Built to replace a spreadsheet, not to be one.

## Stack

Next.js 16 (App Router) + React 19, Prisma 7 on SQLite (via `@libsql/client`), Tailwind v4, shadcn/ui on Base UI. Same stack as the sibling `bgg-recommender` project, including its BGG session-login pattern (BGG's XML API has required a logged-in session since early 2026).

## Running it

```
npm install
npm run dev -- --port 3002
```

Or through the workspace launch config: the `meeple-prints` entry in `../.claude/launch.json`.

## How it works

**Connect** (`/connect`) logs into your BGG account (session token only, never the password, is stored) and pulls your owned collection. Sync now runs automatically once a day alongside the auto-scan cron, not just from the manual "Sync now" button, and the page shows an Up to date/Stale badge for it the same way it does for auto-scan -- if it ever goes stale despite the daily cron running, that almost always means the BGG session itself expired and needs reconnecting. A game that drops out of your real BGG collection is marked `inCollection: false`, never deleted, so prints already saved against it aren't lost; you can also flip that manually from a game's own page ("Remove from collection" / "Add back to collection"), which is undoable from the toast that follows.

BGG's community-maintained [3D Prints for Board Games GeekList](https://boardgamegeek.com/geeklist/186909/3d-prints-for-board-games) looked like a great way to seed a starting catalog, but BGG blocks API access to its GeekList endpoint entirely, even for a real logged-in browser session, so that idea didn't survive contact with the actual API. It's still linked from each game's page as a manual-browse option.

**Catalog** (`/`) auto-populates itself. A daily cron sweep (see Deploying below) searches Printables (no key needed), Thingiverse, Cults3D, and Etsy (each need a free API key, see `.env.example`) for a rolling batch of games, caches relevant hits as `DiscoveredPrint` rows, and Catalog shows them alongside your saved prints with a one-click Save to promote one into a real, trackable `Product`. Results are relevance-filtered (`src/lib/providers/relevance.ts`) before caching, since a raw site search can return noise (a query for "Slay the Spire: The Board Game" matching a "Connect 4 - Board game" listing purely on the words "board" and "game"); the filter requires every distinctive word of the game's name to appear in the result title. One known gap it can't solve: a short, generic game name (e.g. "Covenant") can still collide with an unrelated listing that happens to use that same common word -- each discovered card has a small "not relevant" dismiss button for exactly that case, and a scan never brings a dismissed one back. The "Scan now" button on Catalog and the "Search all sites" button on a game's page both trigger the same scan on demand, MakerWorld and MyMiniFactory don't expose a search API that works from a server, so those stay as deep-link buttons on each game's page.

**Games** (`/games`) sorts your collection by print coverage first, so the games with zero saved prints surface at the top instead of getting lost in an alphabetical list.

A saved print's status (Saved / Queued to Print / Printed / In the Box) can be changed inline from its card or spreadsheet row, without opening the full edit dialog -- the one field you're likely to touch every time you finish a print. Your own 1-5 usefulness rating and free-text tags live in the edit dialog and show up on the card and in the spreadsheet view once set. "Remove from catalog" deletes immediately rather than confirming first, but the toast that follows has an Undo for a few seconds after (it recreates the row rather than a true undo, so it gets a new id, but every other field carries over). "Export" downloads everything as a CSV.

Pasting a link that's already saved doesn't just reject with an error -- it attaches the existing product to whichever of the games you picked aren't linked to it yet, since one print (a generic dice tower, say) can fit several games and shouldn't need a separate row per game.

## Data model

- `Game`: cached from your BGG collection.
- `Product`: a saved print, many-to-many with `Game` (a generic dice tower or a card holder that fits several games doesn't need to be saved twice). `siteRating`/`siteRatingCount`/`siteLikesCount` carry over the source site's popularity metric at save time, distinct from `rating`, your own 1-5 personal usefulness rating.
- `DiscoveredPrint`: a cached, not-yet-saved search hit, one row per `(gameId, url)`, refreshed on every scan.
- `Settings`: a single row holding the connected BGG session.

Search provider credentials (Thingiverse, Cults3D, Etsy) are environment variables, not database rows. See `.env.example` and the Connect page, which shows each one's configured/not-configured status read live from the environment.

## Access

This is a single-household tool with no per-user accounts. The whole site sits behind `/login`, which only accepts the BGG username configured in `OWNER_BGG_USERNAME` and verifies the password against real BGG login; anyone else's valid BGG credentials are rejected. A successful login also connects BGG collection sync, so there's only one login to do. See `.env.example` for the required environment variables.

## Deploying

Production runs on [Turso](https://turso.tech) (hosted libsql) instead of a local SQLite file, since a serverless host like Vercel can't persist one. `DATABASE_URL` becomes a `libsql://...` URL and `DATABASE_AUTH_TOKEN` its token; `src/lib/prisma.ts` picks both up automatically.

Prisma's own `migrate deploy` doesn't understand the `libsql://` scheme, so schema changes don't apply themselves on deploy. After running `npx prisma migrate dev` locally (which still targets the local SQLite file), apply the new migration's SQL directly:

```
turso db shell meeple-prints < prisma/migrations/<new-migration-folder>/migration.sql
```

The daily auto-scan (`vercel.json`) needs `CRON_SECRET` set in Vercel's project env vars (not just `.env.example`) -- Vercel signs its cron requests with it automatically, and the route rejects anything without a matching bearer token. `AUTO_SCAN_BATCH_SIZE` (default 10) is a soft cap: both the cron and manual scan routes set `maxDuration = 60`, and `scanNextBatch` (`src/lib/scan.ts`) stops starting new games once 45s have elapsed rather than risk exceeding that and getting killed mid-run. A game skipped this way is simply first in line next run, since games are scanned in `lastScannedAt` order. Right after deploying (or any time you don't want to wait for the daily sweep to catch up), run `npx tsx scripts/full-scan.ts` once to sweep the whole collection in one go -- point `DATABASE_URL`/`DATABASE_AUTH_TOKEN` at Turso to run it against production instead of local `dev.db`.

## Notes for later

- Price/free defaults on unfurl are a per-domain guess (Thingiverse, Printables, MakerWorld, and MyMiniFactory default to free; everything else doesn't) and are always editable before saving.
