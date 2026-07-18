import type { ProviderCredentials } from "./types";

/** Search provider credentials, sourced from environment variables. */
export function getProviderCredentials(): ProviderCredentials {
  return {
    thingiverseToken: process.env.THINGIVERSE_TOKEN || null,
    cultsUsername: process.env.CULTS_USERNAME || null,
    cultsApiKey: process.env.CULTS_API_KEY || null,
    etsyKeystring: process.env.ETSY_KEYSTRING || null,
    etsySharedSecret: process.env.ETSY_SHARED_SECRET || null,
  };
}
