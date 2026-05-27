import { BASE_URL } from '../constants/api';
import { CollectionEntry } from '../types/collection';

export async function apiGetFullCollection(personId: number): Promise<CollectionEntry[]> {
  const res = await fetch(`${BASE_URL}/api/persons/${personId}/collection/full`);
  if (!res.ok) throw new Error('Error al cargar la colección');
  return res.json();
}
