import { PersonResponse } from './auth';

export type FriendshipStatus     = 'PENDING' | 'ACCEPTED';
export type RelationshipStatus   = 'PENDING_SENT' | 'PENDING_RECEIVED' | 'ACCEPTED' | null;

export interface FriendshipData {
  id:        number;
  requester: PersonResponse;
  receiver:  PersonResponse;
  status:    FriendshipStatus;
}

export interface PersonSearchResult {
  person:             PersonResponse;
  relationshipStatus: RelationshipStatus;
  friendshipId:       number | null;
}
