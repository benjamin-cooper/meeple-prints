-- GeekList import was removed (BGG blocks API access to that endpoint
-- for every client, including a real logged-in browser). Product.source
-- was only ever used to distinguish geeklist-imported rows and is now
-- always "manual" with nothing reading it.
ALTER TABLE "Settings" DROP COLUMN "lastGeeklistSync";
ALTER TABLE "Product" DROP COLUMN "source";
