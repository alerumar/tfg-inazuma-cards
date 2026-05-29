import { BASE_URL } from '../constants/api';
import { TradeData } from '../types/trades';

const base = `${BASE_URL}/api/trades`;

/** Proponer un intercambio: el iniciador ofrece una carta a un amigo. */
export async function apiProposeTrade(
  initiatorId: number,
  receiverId: number,
  cardId: number,
): Promise<TradeData> {
  const res = await fetch(base, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initiatorId, receiverId, cardId }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/** Intercambios activos del usuario (PENDING_RESPONSE | PENDING_CONFIRMATION). */
export async function apiGetActiveTrades(personId: number): Promise<TradeData[]> {
  const res = await fetch(`${base}/persons/${personId}/active`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/** Historial de intercambios del usuario. */
export async function apiGetTradeHistory(personId: number): Promise<TradeData[]> {
  const res = await fetch(`${base}/persons/${personId}/history`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/** El receptor responde: ofrece su carta (receiverCardId) o rechaza (null). */
export async function apiRespondTrade(
  tradeId: number,
  receiverId: number,
  receiverCardId: number | null,
): Promise<TradeData> {
  const res = await fetch(`${base}/${tradeId}/respond`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ receiverId, receiverCardId }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/** IDs de todas las personas que tienen un intercambio activo en este momento. */
export async function apiGetActiveParticipantIds(): Promise<number[]> {
  const res = await fetch(`${base}/active-participant-ids`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/** Obtiene un intercambio por ID. */
export async function apiGetTrade(tradeId: number): Promise<TradeData> {
  const res = await fetch(`${base}/${tradeId}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/** El iniciador retira su propuesta cuando aún no ha recibido respuesta. */
export async function apiCancelTrade(
  tradeId: number,
  initiatorId: number,
): Promise<TradeData> {
  const res = await fetch(`${base}/${tradeId}/cancel`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initiatorId }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/** El iniciador confirma (accept=true) o rechaza (accept=false) la contra-oferta. */
export async function apiConfirmTrade(
  tradeId: number,
  initiatorId: number,
  accept: boolean,
): Promise<TradeData> {
  const res = await fetch(`${base}/${tradeId}/confirm`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initiatorId, accept }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
