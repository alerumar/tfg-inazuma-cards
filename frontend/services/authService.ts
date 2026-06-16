import { Platform } from 'react-native';
import { BASE_URL } from '../constants/api';
import { LoginRequest, PersonResponse, RegisterRequest } from '../types/auth';

const HEADERS = { 'Content-Type': 'application/json' };

async function extractErrorMessage(res: Response, fallback: string): Promise<string> {
  const text = await res.text();
  console.log('[API ERROR]', res.status, res.url, text);
  try {
    const json = JSON.parse(text);
    if (json && typeof json === 'object')
      return json.message || json.detail || json.error || json.title || fallback;
  } catch {}
  return text || fallback;
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = 8000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (e: any) {
    if (e?.name === 'AbortError') throw new Error('No se pudo conectar con el servidor. Comprueba tu conexión.');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export async function apiLogin(data: LoginRequest): Promise<PersonResponse> {
  const res = await fetchWithTimeout(`${BASE_URL}/api/persons/login`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(data),
  });

  if (res.status === 401) throw new Error('El usuario o la contraseña no son correctos');
  if (!res.ok) throw new Error(await extractErrorMessage(res, 'Error al iniciar sesión'));
  return res.json();
}

export async function apiRegister(data: RegisterRequest): Promise<PersonResponse> {
  const res = await fetchWithTimeout(`${BASE_URL}/api/persons/register`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(data),
  });

  if (!res.ok) throw new Error(await extractErrorMessage(res, 'Error al registrarse'));
  return res.json();
}

export async function apiUpdatePerson(
  personId: number,
  data: { name?: string; surname?: string; nickname?: string; email?: string },
): Promise<PersonResponse> {
  const res = await fetchWithTimeout(`${BASE_URL}/api/persons/${personId}`, {
    method: 'PUT',
    headers: HEADERS,
    body: JSON.stringify(data),
  });

  if (!res.ok) throw new Error(await extractErrorMessage(res, 'Error al actualizar el perfil'));
  return res.json();
}

export async function apiChangePassword(
  personId: number,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const res = await fetchWithTimeout(`${BASE_URL}/api/persons/${personId}/change-password`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  if (!res.ok) throw new Error(await extractErrorMessage(res, 'Error al cambiar la contraseña'));
}

export async function apiGetPerson(personId: number): Promise<PersonResponse> {
  const res = await fetch(`${BASE_URL}/api/persons/${personId}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiHeartbeat(personId: number): Promise<void> {
  try {
    await fetch(`${BASE_URL}/api/persons/${personId}/heartbeat`, { method: 'PATCH' });
  } catch {
  }
}

export async function apiDeletePerson(personId: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/persons/${personId}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 204) {
    throw new Error('Error al eliminar la cuenta');
  }
}

export async function apiUploadPhoto(
  personId: number,
  imageUri: string,
): Promise<PersonResponse> {
  const form = new FormData();

  const rawName  = imageUri.split('/').pop()?.split('?')[0] ?? 'photo.jpg';
  const filename = rawName.includes('.') ? rawName : 'photo.jpg';
  const ext      = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
  const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

  if (Platform.OS === 'web') {
    const fetchRes = await fetch(imageUri);
    const blob     = await fetchRes.blob();
    form.append('file', blob, filename);
  } else {
    form.append('file', { uri: imageUri, name: filename, type: mimeType } as unknown as Blob);
  }

  const res = await fetch(`${BASE_URL}/api/persons/${personId}/photo`, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) throw new Error(await extractErrorMessage(res, 'Error al subir la foto'));
  return res.json();
}
