-- AlterTable
ALTER TABLE "Game" ADD COLUMN "lastScannedAt" DATETIME;

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN "cultsApiKey" TEXT;
ALTER TABLE "Settings" ADD COLUMN "cultsUsername" TEXT;
ALTER TABLE "Settings" ADD COLUMN "etsyApiKey" TEXT;
ALTER TABLE "Settings" ADD COLUMN "thingiverseToken" TEXT;
