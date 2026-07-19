-- AlterTable
ALTER TABLE "Product" ADD COLUMN "siteRating" REAL;
ALTER TABLE "Product" ADD COLUMN "siteRatingCount" INTEGER;
ALTER TABLE "Product" ADD COLUMN "siteLikesCount" INTEGER;

-- CreateTable
CREATE TABLE "DiscoveredPrint" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "gameId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "domain" TEXT NOT NULL,
    "siteName" TEXT,
    "type" TEXT NOT NULL DEFAULT 'other',
    "creator" TEXT,
    "price" REAL,
    "currency" TEXT,
    "isFree" BOOLEAN NOT NULL DEFAULT false,
    "rating" REAL,
    "ratingCount" INTEGER,
    "likesCount" INTEGER,
    "firstSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" DATETIME NOT NULL,
    CONSTRAINT "DiscoveredPrint_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "DiscoveredPrint_gameId_url_key" ON "DiscoveredPrint"("gameId", "url");
