import { BASE_URL } from '../constants/api';
import { DeckCardEntry, DeckData } from '../types/decks';

export async function apiGetDecks(personId: number): Promise<DeckData[]> {
  const res = await fetch(`${BASE_URL}/api/persons/${personId}/decks`);
  if (!res.ok) throw new Error('Error al cargar las barajas');
  return res.json();
}

export async function apiGetDeck(personId: number, deckId: number): Promise<DeckData> {
  const res = await fetch(`${BASE_URL}/api/persons/${personId}/decks/${deckId}`);
  if (!res.ok) throw new Error('Error al cargar la baraja');
  return res.json();
}

export async function apiCreateDeck(
  personId: number,
  name: string,
  cardIds: number[],
): Promise<DeckData> {
  const res = await fetch(`${BASE_URL}/api/persons/${personId}/decks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, cardIds }),
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || 'Error al crear la baraja');
  }
  return res.json();
}

export async function apiRenameDeck(
  personId: number,
  deckId: number,
  name: string,
): Promise<DeckData> {
  const res = await fetch(`${BASE_URL}/api/persons/${personId}/decks/${deckId}/rename`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || 'Error al renombrar la baraja');
  }
  return res.json();
}

export async function apiAddCardToDeck(
  personId: number,
  deckId: number,
  cardId: number,
): Promise<DeckCardEntry> {
  const res = await fetch(
    `${BASE_URL}/api/persons/${personId}/decks/${deckId}/cards/${cardId}`,
    { method: 'POST' },
  );
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || 'Error al añadir la carta');
  }
  return res.json();
}

export async function apiRemoveCardFromDeck(
  personId: number,
  deckId: number,
  deckCardId: number,
): Promise<void> {
  const res = await fetch(
    `${BASE_URL}/api/persons/${personId}/decks/${deckId}/cards/${deckCardId}`,
    { method: 'DELETE' },
  );
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || 'Error al eliminar la carta');
  }
}

export async function apiDeleteDeck(personId: number, deckId: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/persons/${personId}/decks/${deckId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || 'Error al eliminar la baraja');
  }
}
