import { Platform } from 'react-native';
import { BASE_URL } from '../constants/api';
import { LoginRequest, PersonResponse, RegisterRequest } from '../types/auth';

const HEADERS = { 'Content-Type': 'application/json' };

export async function apiLogin(data: LoginRequest): Promise<PersonResponse> {
  const res = await fetch(`${BASE_URL}/api/persons/login`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(data),
  });

  if (res.status === 401) throw new Error('El usuario o la contraseña no son correctos');
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || 'Error al iniciar sesión');
  }
  return res.json();
}

export async function apiRegister(data: RegisterRequest): Promise<PersonResponse> {
  const res = await fetch(`${BASE_URL}/api/persons/register`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || 'Error al registrarse');
  }
  return res.json();
}

export async function apiUpdatePerson(
  personId: number,
  data: { name?: string; surname?: string; nickname?: string; email?: string },
): Promise<PersonResponse> {
  const res = await fetch(`${BASE_URL}/api/persons/${personId}`, {
    method: 'PUT',
    headers: HEADERS,
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || 'Error al actualizar el perfil');
  }
  return res.json();
}

export async function apiChangePassword(
  personId: number,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/persons/${personId}/change-password`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || 'Error al cambiar la contraseña');
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

  // Extraer nombre y extensión del URI
  const rawName  = imageUri.split('/').pop()?.split('?')[0] ?? 'photo.jpg';
  const filename = rawName.includes('.') ? rawName : 'photo.jpg';
  const ext      = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
  const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

  if (Platform.OS === 'web') {
    // En web el URI puede ser data: o blob: → obtenemos el Blob real
    const fetchRes = await fetch(imageUri);
    const blob     = await fetchRes.blob();
    form.append('file', blob, filename);
  } else {
    // En iOS/Android usamos el formato nativo de React Native FormData
    form.append('file', { uri: imageUri, name: filename, type: mimeType } as unknown as Blob);
  }

  const res = await fetch(`${BASE_URL}/api/persons/${personId}/photo`, {
    method: 'POST',
    body: form,
    // NO poner Content-Type manualmente: el browser/RN lo fija con el boundary correcto
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || 'Error al subir la foto');
  }
  return res.json();
}
