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

/** DTO ligero usado en listados, historial y banner de invitación. */
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
  /** Turnos ganados en la última ronda — para el sub-marcador del historial. */
  turnsWonPlayer1LastRound: number;
  turnsWonPlayer2LastRound: number;
  /** true si la partida terminó por abandono o desconexión. */
  wonByAbandon: boolean;
  winnerId: number | null;
  createdAt: string;
}

/** Estado completo de una carta dentro de la partida (mano de cada jugador). */
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
  /** true cuando la carta es LEGEND y el jugador la ha usado 2 turnos consecutivos */
  legendBlocked: boolean;
}

/** Helper: true cuando los tres atributos han sido usados. */
export function isDiscarded(c: CardStateDto): boolean {
  return c.attackUsed && c.controlUsed && c.defenseUsed;
}

/** Estado de un turno concreto. Los datos de la carta se ocultan hasta que result !== PENDING. */
export interface TurnStateDto {
  /** Número de ronda global — combinado con turnNumber forma un identificador único. */
  roundNumber: number;
  turnNumber: number;
  /** ISO-8601 — cuándo empezó el turno; el cliente lo usa para la cuenta atrás de 45 s. */
  turnCreatedAt: string;
  player1Submitted: boolean;
  player2Submitted: boolean;
  /** Solo presente cuando result !== PENDING */
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

/** Respuesta completa del polling durante una partida. */
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
  /** true cuando la partida terminó por forfeit o desconexión */
  wonByAbandon: boolean;
  /** Recompensas obtenidas — solo significativas cuando status === 'FINISHED' */
  rewardXpPlayer1: number;
  rewardPackPointsPlayer1: number;
  rewardXpPlayer2: number;
  rewardPackPointsPlayer2: number;
  createdAt: string;
  /** Revancha inmediata — ambos deben votar sí en ≤ 30 s */
  player1WantsRematch: boolean;
  player2WantsRematch: boolean;
  /** ID de la nueva partida creada cuando los dos aceptan; null hasta entonces. */
  rematchMatchId: number | null;
  /** true si el jugador envió heartbeat en los últimos 35 s (detecta desconexión real). */
  player1Connected: boolean;
  player2Connected: boolean;
}

/** Etiquetas legibles por atributo. */
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
