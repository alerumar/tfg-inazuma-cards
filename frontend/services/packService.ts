import { BASE_URL } from '../constants/api';
import { PackOpenResult, PackStatus, PackType } from '../types/packs';

const base = (id: number) => `${BASE_URL}/api/persons/${id}/packs`;
const H    = { 'Content-Type': 'application/json' };

export async function apiGetPackStatus(personId: number): Promise<PackStatus> {
  const res = await fetch(`${base(personId)}/status`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiOpenFreePack(
  personId: number,
  type: PackType,
): Promise<PackOpenResult> {
  const res = await fetch(`${base(personId)}/open/free`, {
    method: 'POST', headers: H, body: JSON.stringify({ type }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiOpenPackWithPoints(
  personId: number,
  type: PackType,
): Promise<PackOpenResult> {
  const res = await fetch(`${base(personId)}/open/points`, {
    method: 'POST', headers: H, body: JSON.stringify({ type }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiClaimDailyReward(personId: number): Promise<number> {
  const res = await fetch(`${base(personId)}/daily`, { method: 'POST', headers: H });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json(); // { pointsGranted: number }
  return data.pointsGranted;
}
