export interface ProviderCredentials {
  thingiverseToken: string | null;
  cultsUsername: string | null;
  cultsApiKey: string | null;
  etsyKeystring: string | null;
  etsySharedSecret: string | null;
  myminifactoryApiKey: string | null;
}

export interface ProviderResult {
  url: string;
  title: string;
  thumbnailUrl: string | null;
  creator: string | null;
  price: number | null;
  currency: string | null;
  isFree: boolean;
  /** 0-5 average rating. Only Printables exposes this. */
  rating: number | null;
  /** Review count backing `rating`. */
  ratingCount: number | null;
  /** Like/favorite count, for sites with no star-rating system (Thingiverse, Cults3D). */
  likesCount: number | null;
}

export interface ProviderOutcome {
  domain: string;
  siteName: string;
  /** True if this provider ran with no credentials needed (e.g. Printables). */
  needsCredentials: boolean;
  hasCredentials: boolean;
  results: ProviderResult[];
  error: string | null;
}

export interface SearchProvider {
  domain: string;
  siteName: string;
  needsCredentials: boolean;
  hasCredentials: (creds: ProviderCredentials) => boolean;
  search: (query: string, creds: ProviderCredentials) => Promise<ProviderResult[]>;
}
