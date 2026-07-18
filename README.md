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

**Connect** (`/connect`) logs into your BGG account (session token only, never the password, is stored) and pulls your owned collection. From there it can also walk BGG's community-maintained [3D Prints for Board Games GeekList](https://boardgamegeek.com/geeklist/186909/3d-prints-for-board-games) and match its links to games already in your collection, seeding a starting catalog. Imported entries get a best-guess title from the URL itself; opening an entry and hitting "Fetch details" pulls the real title, image, and description on demand.

**Discover** (`/discover`) searches Printables (no key needed), Thingiverse, Cults3D, and Etsy (each need a free API key, added on Connect) for a single game or a batch of unscanned games at once, merging every site's hits into one filterable grid: source, guessed accessory type, free-only, price sort, with a one-click Save per result. MakerWorld and MyMiniFactory don't expose a search API that works from a server, so those stay as deep-link buttons on each game's page instead.

**Games** (`/games`) sorts your collection by print coverage first, so the games with zero saved prints surface at the top instead of getting lost in an alphabetical list.

## Data model

- `Game`: cached from your BGG collection.
- `Product`: a saved print, many-to-many with `Game` (a generic dice tower or a card holder that fits several games doesn't need to be saved twice).
- `Settings`: a single row holding the connected BGG session and each site's search API credentials.

## Access

This is a single-household tool with no per-user accounts. The whole site sits behind `/login`, which only accepts the BGG username configured in `OWNER_BGG_USERNAME` and verifies the password against real BGG login; anyone else's valid BGG credentials are rejected. A successful login also connects BGG collection sync, so there's only one login to do. See `.env.example` for the required environment variables.

## Notes for later

- No manual dark-mode toggle is wired up yet, though the CSS variables already support a `.dark` class the way the sibling projects do.
- Price/free defaults on unfurl are a per-domain guess (Thingiverse, Printables, MakerWorld, and MyMiniFactory default to free; everything else doesn't) and are always editable before saving.
