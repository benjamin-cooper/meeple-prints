-- CreateTable
CREATE TABLE "Game" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "bggId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "yearPublished" INTEGER,
    "thumbnail" TEXT,
    "image" TEXT,
    "minPlayers" INTEGER,
    "maxPlayers" INTEGER,
    "inCollection" BOOLEAN NOT NULL DEFAULT true,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Product" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "thumbnailUrl" TEXT,
    "domain" TEXT NOT NULL,
    "siteName" TEXT,
    "type" TEXT NOT NULL DEFAULT 'other',
    "creator" TEXT,
    "price" REAL,
    "currency" TEXT DEFAULT 'USD',
    "isFree" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'wishlist',
    "rating" INTEGER,
    "notes" TEXT,
    "tags" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "bggUsername" TEXT,
    "lastCollectionSync" DATETIME,
    "lastGeeklistSync" DATETIME
);

-- CreateTable
CREATE TABLE "_GameToProduct" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_GameToProduct_A_fkey" FOREIGN KEY ("A") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_GameToProduct_B_fkey" FOREIGN KEY ("B") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Game_bggId_key" ON "Game"("bggId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_url_key" ON "Product"("url");

-- CreateIndex
CREATE UNIQUE INDEX "_GameToProduct_AB_unique" ON "_GameToProduct"("A", "B");

-- CreateIndex
CREATE INDEX "_GameToProduct_B_index" ON "_GameToProduct"("B");
