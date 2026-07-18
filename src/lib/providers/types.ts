export interface ProviderCredentials {
  thingiverseToken: string | null;
  cultsUsername: string | null;
  cultsApiKey: string | null;
  etsyApiKey: string | null;
}

export interface ProviderResult {
  url: string;
  title: string;
  thumbnailUrl: string | null;
  creator: string | null;
  price: number | null;
  currency: string | null;
  isFree: boolean;
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
