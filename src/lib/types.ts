export interface GameSummary {
  id: number;
  name: string;
  thumbnail: string | null;
  bggId: number;
}

export interface Game extends GameSummary {
  yearPublished: number | null;
  image: string | null;
  inCollection: boolean;
  _count?: { products: number };
}

export interface Product {
  id: number;
  url: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  domain: string;
  siteName: string | null;
  type: string;
  creator: string | null;
  price: number | null;
  currency: string | null;
  isFree: boolean;
  status: string;
  rating: number | null;
  siteRating: number | null;
  siteRatingCount: number | null;
  siteLikesCount: number | null;
  notes: string | null;
  tags: string | null;
  createdAt: string;
  updatedAt: string;
  games: GameSummary[];
}

export interface DiscoveredPrint {
  id: number;
  url: string;
  title: string;
  thumbnailUrl: string | null;
  domain: string;
  siteName: string | null;
  type: string;
  creator: string | null;
  price: number | null;
  currency: string | null;
  isFree: boolean;
  rating: number | null;
  ratingCount: number | null;
  likesCount: number | null;
  createdAt: string;
  lastSeenAt: string;
  game: GameSummary;
}

export type CatalogItem =
  | (Product & { kind: "saved" })
  | (DiscoveredPrint & { kind: "discovered" });
