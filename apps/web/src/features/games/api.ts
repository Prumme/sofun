import { readCredentials } from '@/lib/session/storage';
export async function contentRequest(path: string, init: RequestInit = {}) {
  const credentials = readCredentials();
  if (!credentials) throw new Error('Session hôte indisponible.');
  const response = await fetch(`/api/${path}`, { ...init, headers: { ...init.headers, Authorization: `Bearer ${credentials.token}`, 'X-Room-Id': credentials.roomId, 'X-Session-Id': credentials.sessionId } });
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const message = body && typeof body === 'object' && 'message' in body && typeof body.message === 'string' ? body.message : 'Opération indisponible.';
    throw new Error(message);
  }
  return response;
}
