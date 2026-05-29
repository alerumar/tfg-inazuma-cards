export type NotificationType =
  | 'FRIEND_REQUEST_ACCEPTED'
  | 'FRIEND_REQUEST_REJECTED';

export interface NotificationData {
  id: number;
  type: NotificationType;
  message: string;
  read: boolean;
  actorNickname: string | null;
  actorProfilePhoto: string | null;
  createdAt: string; // ISO LocalDateTime from Java
}
