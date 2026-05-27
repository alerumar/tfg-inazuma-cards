export type MissionType =
  | 'WIN_MATCHES'
  | 'PLAY_MATCHES'
  | 'COLLECT_CARDS'
  | 'COLLECT_LEGENDS'
  | 'OPEN_PACKS'
  | 'ADD_FRIENDS'
  | 'COMPLETE_TRADES'
  | 'REACH_LEVEL';

export interface MissionData {
  id: number;
  name: string;
  description: string | null;
  type: MissionType;
  goal: number;
  rewardExperience: number;
  rewardPoints: number;
}

export interface PersonMissionData {
  id: number;
  mission: MissionData;
  progress: number;
  completed: boolean;
  claimed: boolean;
  percentage: number;
}

export interface ClaimRewardResponse {
  mission: PersonMissionData;
  person: import('./auth').PersonResponse;
}
