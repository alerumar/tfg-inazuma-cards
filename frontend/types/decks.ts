import { CardData } from './collection';

export interface DeckCardEntry {
  deckCardId: number;
  card: CardData;
}

export interface DeckData {
  id: number;
  name: string;
  cards: DeckCardEntry[];
}
