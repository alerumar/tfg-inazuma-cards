import { PersonResponse } from './auth';

export type MatchStatus =
  | 'PENDING_INVITE'
  | 'WAITING_READY'
  | 'IN_PROGRESS'
  | 'FINISHED'
  | 'REJECTED'
  | 'CANCELLED';

export type CardAttribute = 'ATTACK' | 'CONTROL' | 'DEFENSE';
export type TurnResult    = 'PENDING' | 'PLAYER1_WINS' | 'PLAYER2_WINS' | 'TIE';
export type CardType      = 'NORMAL' | 'LEGEND';
export type CardPosition  = 'GOALKEEPER' | 'DEFENDER' | 'MIDFIELDER' | 'FORWARD';

export interface MatchResponse {
  id: number;
  status: MatchStatus;
  player1: PersonResponse;
  player2: PersonResponse;
  deck1Id: number | null;
  deck2Id: number | null;
  player1Ready: boolean;
  player2Ready: boolean;
  roundsWonPlayer1: number;
  roundsWonPlayer2: number;
  
  turnsWonPlayer1LastRound: number;
  turnsWonPlayer2LastRound: number;
  
  wonByAbandon: boolean;
  winnerId: number | null;
  createdAt: string;
}

export interface CardStateDto {
  cardId: number;
  name: string;
  imageUrl: string;
  type: CardType;
  position: CardPosition;
  rating: number;
  attack: number;
  control: number;
  defense: number;
  attackUsed: boolean;
  controlUsed: boolean;
  defenseUsed: boolean;
  
  legendBlocked: boolean;
}

export function isDiscarded(c: CardStateDto): boolean {
  return c.attackUsed && c.controlUsed && c.defenseUsed;
}

export interface TurnStateDto {

  roundNumber: number;
  turnNumber: number;

  turnCreatedAt: string;
  turnSecondsRemaining: number;
  player1Submitted: boolean;
  player2Submitted: boolean;
  
  player1CardId: number | null;
  player1CardName: string | null;
  player1CardImage: string | null;
  player1Attribute: CardAttribute | null;
  player1Value: number | null;
  player2CardId: number | null;
  player2CardName: string | null;
  player2CardImage: string | null;
  player2Attribute: CardAttribute | null;
  player2Value: number | null;
  result: TurnResult;
}

export interface MatchStateResponse {
  id: number;
  status: MatchStatus;
  player1: PersonResponse;
  player2: PersonResponse;
  deck1Id: number | null;
  deck2Id: number | null;
  player1Ready: boolean;
  player2Ready: boolean;
  roundsWonPlayer1: number;
  roundsWonPlayer2: number;
  currentRoundNumber: number;
  turnsWonPlayer1InRound: number;
  turnsWonPlayer2InRound: number;
  player1Cards: CardStateDto[];
  player2Cards: CardStateDto[];
  pendingTurn: TurnStateDto | null;
  lastCompletedTurn: TurnStateDto | null;
  winnerId: number | null;
  draw: boolean;
  
  wonByAbandon: boolean;
  
  rewardXpPlayer1: number;
  rewardPackPointsPlayer1: number;
  rewardXpPlayer2: number;
  rewardPackPointsPlayer2: number;
  createdAt: string;
  
  player1WantsRematch: boolean;
  player2WantsRematch: boolean;
  
  rematchMatchId: number | null;
  
  player1Connected: boolean;
  player2Connected: boolean;
}

export const ATTR_LABEL: Record<CardAttribute, string> = {
  ATTACK:  'ATQ',
  CONTROL: 'CTR',
  DEFENSE: 'DEF',
};

export const ATTR_COLOR: Record<CardAttribute, string> = {
  ATTACK:  '#EF4444',
  CONTROL: '#3B82F6',
  DEFENSE: '#22C55E',
};
