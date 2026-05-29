import { BASE_URL } from '../constants/api';
import { NotificationData } from '../types/notifications';

const base = (personId: number) =>
  `${BASE_URL}/api/persons/${personId}/notifications`;

/** Todas las notificaciones del usuario (más reciente primero). */
export async function apiGetNotifications(personId: number): Promise<NotificationData[]> {
  const res = await fetch(base(personId));
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/** Número de notificaciones no leídas. */
export async function apiGetUnreadCount(personId: number): Promise<number> {
  const res = await fetch(`${base(personId)}/unread-count`);
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.count as number;
}

/** Marca todas las notificaciones como leídas. */
export async function apiMarkAllRead(personId: number): Promise<void> {
  const res = await fetch(`${base(personId)}/read-all`, { method: 'PATCH' });
  if (!res.ok && res.status !== 204) throw new Error(await res.text());
}
