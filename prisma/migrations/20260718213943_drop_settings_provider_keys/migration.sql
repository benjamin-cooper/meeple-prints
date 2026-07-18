-- Search provider credentials (Thingiverse, Cults3D, Etsy) move to
-- environment variables instead of the database.
ALTER TABLE "Settings" DROP COLUMN "thingiverseToken";
ALTER TABLE "Settings" DROP COLUMN "cultsUsername";
ALTER TABLE "Settings" DROP COLUMN "cultsApiKey";
ALTER TABLE "Settings" DROP COLUMN "etsyApiKey";
