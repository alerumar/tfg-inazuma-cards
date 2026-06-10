import { CardData } from './collection';
import { PersonResponse } from './auth';

export type TradeStatus =
  | 'PENDING_RESPONSE'
  | 'PENDING_CONFIRMATION'
  | 'COMPLETED'
  | 'REJECTED_BY_RECEIVER'
  | 'REJECTED_BY_INITIATOR';

export interface TradeData {
  id: number;
  initiator: PersonResponse;
  receiver: PersonResponse;
  initiatorCard: CardData;
  receiverCard: CardData | null;
  status: TradeStatus;
  date: string;
}
