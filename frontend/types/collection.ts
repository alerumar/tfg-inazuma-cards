export interface CardData {
  id: number;
  name: string;
  collection: string | null;
  team: string | null;
  nickname: string | null;
  imageUrl: string | null;
  type: 'NORMAL' | 'LEGEND';
  cardPackage: 'INAZUMA_ELEVEN' | 'INAZUMA_ELEVEN_GO' | null;
  position: 'POR' | 'DF' | 'MC' | 'DC' | null;
  rating: number;
  attack: number;
  control: number;
  defense: number;
}

export interface CollectionEntry {
  card: CardData;
  owned: boolean;
  quantity: number;
}
