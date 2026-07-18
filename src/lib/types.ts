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
  notes: string | null;
  tags: string | null;
  createdAt: string;
  updatedAt: string;
  games: GameSummary[];
}
