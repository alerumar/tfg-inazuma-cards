export interface PersonResponse {
  id: number;
  playerId: string;
  name: string;
  surname: string | null;
  nickname: string;
  email: string;
  profilePhoto: string | null;
  level: number;
  experience: number;
  totalExperience: number;
  packPoints: number;
  accumulatedPacks: number;
  lastPackDate: string | null;
  lastDailyReward: string | null;
  cardCount: number;
  friendCount: number;
  online: boolean;
  /** true si el jugador tiene una partida activa (PENDING_INVITE / WAITING_READY / IN_PROGRESS). */
  inActiveMatch: boolean;
}

export interface LoginRequest {
  nickname: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  surname?: string;
  nickname: string;
  email: string;
  password: string;
}
