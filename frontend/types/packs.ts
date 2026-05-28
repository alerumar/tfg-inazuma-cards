import { CardData } from './collection';

export type PackType = 'INAZUMA_ELEVEN' | 'INAZUMA_ELEVEN_GO';

export interface PackCardResult {
  card: CardData;
  isNew: boolean;
}

export interface PackOpenResult {
  cards: PackCardResult[];
}

export interface PackStatus {
  accumulatedPacks:       number;
  packPoints:             number;
  minutesUntilNextPack:   number;
  pointsCostNow:          number;
  dailyRewardAvailable:   boolean;
  minutesUntilDailyReset: number;
}
