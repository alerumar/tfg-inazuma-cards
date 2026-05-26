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
