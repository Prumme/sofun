import { credentialsSchema } from '@party/contracts';
import type { Credentials } from '@party/contracts';
const KEY = 'party-games.session';
export function readCredentials(): Credentials | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    const result = credentialsSchema.safeParse(raw ? JSON.parse(raw) : null);
    return result.success ? result.data : null;
  } catch { return null; }
}
export function saveCredentials(credentials: Credentials): void { sessionStorage.setItem(KEY, JSON.stringify(credentialsSchema.parse(credentials))); }
export function clearCredentials(): void { sessionStorage.removeItem(KEY); }
