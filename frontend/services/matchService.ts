import { BASE_URL } from '../constants/api';
import { CardAttribute, MatchResponse, MatchStateResponse } from '../types/match';

const base = `${BASE_URL}/api/matches`;
const H = { 'Content-Type': 'application/json' };

// ── Invitación ──────────────────────────────────────────────────────────────

/** RF-31 — El iniciador invita a un amigo a jugar. */
export async function apiInvitePlayer(
  initiatorId: number,
  receiverId: number,
): Promise<MatchResponse> {
  const res = await fetch(`${base}/invite`, {
    method: 'POST', headers: H,
    body: JSON.stringify({ initiatorId, receiverId }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/** RF-32 — Aceptar o rechazar invitación. */
export async function apiRespondInvite(
  matchId: number,
  receiverId: number,
  accept: boolean,
): Promise<MatchResponse> {
  const res = await fetch(`${base}/${matchId}/respond-invite`, {
    method: 'PATCH', headers: H,
    body: JSON.stringify({ receiverId, accept }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/** Cancelar invitación enviada o salir del lobby. */
export async function apiCancelMatch(
  matchId: number,
  playerId: number,
): Promise<MatchResponse> {
  const res = await fetch(`${base}/${matchId}/cancel`, {
    method: 'PATCH', headers: H,
    body: JSON.stringify({ playerId }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ── Lobby ───────────────────────────────────────────────────────────────────

/** RF-33 — Elegir baraja y marcar listo. */
export async function apiSetReady(
  matchId: number,
  playerId: number,
  deckId: number,
): Promise<MatchResponse> {
  const res = await fetch(`${base}/${matchId}/ready`, {
    method: 'PATCH', headers: H,
    body: JSON.stringify({ playerId, deckId }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/** Desmarcar listo para poder cambiar de baraja (antes de que el rival también lo esté). */
export async function apiUnsetReady(
  matchId: number,
  playerId: number,
): Promise<MatchStateResponse> {
  const res = await fetch(`${base}/${matchId}/unready`, {
    method: 'PATCH', headers: H,
    body: JSON.stringify({ playerId }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ── Partida en curso ─────────────────────────────────────────────────────────

/** Polling — estado completo de la partida. */
export async function apiGetMatchState(matchId: number): Promise<MatchStateResponse> {
  const res = await fetch(`${base}/${matchId}/state`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/** RF-34 — Enviar jugada (carta + atributo). */
export async function apiSubmitMove(
  matchId: number,
  playerId: number,
  cardId: number,
  attribute: CardAttribute,
): Promise<MatchStateResponse> {
  const res = await fetch(`${base}/${matchId}/move`, {
    method: 'POST', headers: H,
    body: JSON.stringify({ playerId, cardId, attribute }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/** RNF-04 — Heartbeat de partida para mantener la sesión activa. */
export async function apiMatchHeartbeat(
  matchId: number,
  playerId: number,
): Promise<void> {
  try {
    await fetch(`${base}/${matchId}/heartbeat`, {
      method: 'PATCH', headers: H,
      body: JSON.stringify({ playerId }),
    });
  } catch {
    // Silencioso — un fallo de red no debe romper el juego
  }
}

/** RF-50 — Votar revancha inmediata (wants=true aceptar / false cancelar). */
export async function apiVoteRematch(
  matchId: number,
  playerId: number,
  wants: boolean,
): Promise<MatchStateResponse> {
  const res = await fetch(`${base}/${matchId}/rematch-vote`, {
    method: 'PATCH', headers: H,
    body: JSON.stringify({ playerId, wants }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/** Abandonar voluntariamente la partida. */
export async function apiForfeit(
  matchId: number,
  playerId: number,
): Promise<MatchStateResponse> {
  const res = await fetch(`${base}/${matchId}/forfeit`, {
    method: 'PATCH', headers: H,
    body: JSON.stringify({ playerId }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ── Consultas ────────────────────────────────────────────────────────────────

/** Partidas activas de un jugador (PENDING_INVITE | WAITING_READY | IN_PROGRESS). */
export async function apiGetActiveMatches(personId: number): Promise<MatchResponse[]> {
  const res = await fetch(`${base}/persons/${personId}/active`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/** Invitaciones pendientes donde el jugador es receptor. */
export async function apiGetPendingInvites(personId: number): Promise<MatchResponse[]> {
  const res = await fetch(`${base}/persons/${personId}/pending-invites`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/** Historial de partidas terminadas. */
export async function apiGetMatchHistory(personId: number): Promise<MatchResponse[]> {
  const res = await fetch(`${base}/persons/${personId}/history`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
