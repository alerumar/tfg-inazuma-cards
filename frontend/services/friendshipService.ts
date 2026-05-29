import { BASE_URL } from '../constants/api';
import { FriendshipData, PersonSearchResult } from '../types/friendship';

const base = (id: number) => `${BASE_URL}/api/persons/${id}/friendships`;

export async function apiSearchPersons(personId: number, q: string): Promise<PersonSearchResult[]> {
  const res = await fetch(`${base(personId)}/search?q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiSendFriendRequest(personId: number, receiverPlayerId: string): Promise<FriendshipData> {
  const res = await fetch(`${base(personId)}/request/${receiverPlayerId}`, { method: 'POST' });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiGetPendingReceived(personId: number): Promise<FriendshipData[]> {
  const res = await fetch(`${base(personId)}/pending/received`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiAcceptFriendRequest(personId: number, friendshipId: number): Promise<FriendshipData> {
  const res = await fetch(`${base(personId)}/${friendshipId}/accept`, { method: 'PATCH' });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiRejectFriendRequest(personId: number, friendshipId: number): Promise<void> {
  const res = await fetch(`${base(personId)}/${friendshipId}/reject`, { method: 'DELETE' });
  if (!res.ok && res.status !== 204) throw new Error(await res.text());
}

export async function apiGetFriends(personId: number): Promise<FriendshipData[]> {
  const res = await fetch(`${base(personId)}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiRemoveFriend(personId: number, friendshipId: number): Promise<void> {
  const res = await fetch(`${base(personId)}/${friendshipId}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 204) throw new Error(await res.text());
}

// Cancelar una solicitud enviada (el remitente la retira)
export const apiCancelFriendRequest = apiRemoveFriend;

export async function apiGetPendingSent(personId: number): Promise<FriendshipData[]> {
  const res = await fetch(`${base(personId)}/pending/sent`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
