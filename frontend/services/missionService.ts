import { BASE_URL } from '../constants/api';
import { ClaimRewardResponse, PersonMissionData } from '../types/missions';

export async function apiGetMissions(personId: number): Promise<PersonMissionData[]> {
  const res = await fetch(`${BASE_URL}/api/persons/${personId}/missions`);
  if (!res.ok) throw new Error('Error al cargar las misiones');
  return res.json();
}

export async function apiClaimMission(
  personId: number,
  personMissionId: number,
): Promise<ClaimRewardResponse> {
  const res = await fetch(
    `${BASE_URL}/api/persons/${personId}/missions/${personMissionId}/claim`,
    { method: 'POST' },
  );
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || 'Error al reclamar la recompensa');
  }
  return res.json();
}
