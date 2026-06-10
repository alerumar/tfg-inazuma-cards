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
  totalCardCount: number;
  friendCount: number;
  online: boolean;
  
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
