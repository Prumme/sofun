import { roomCodeSchema } from '@party/contracts';

export function buildInviteUrl(origin: string, code: string): string | null {
  const base = new URL(origin);
  const host = base.hostname.toLowerCase().replace(/\.$/, '');
  if (!['http:', 'https:'].includes(base.protocol) || host === 'localhost' || host.endsWith('.localhost') || host.startsWith('127.') || ['[::1]', '[::]', '0.0.0.0'].includes(host)) return null;
  const url = new URL('/join', base.origin);
  url.searchParams.set('code', roomCodeSchema.parse(code));
  return url.href;
}
export function readInviteCode(search: string): { code: string; invalid: boolean } {
  const values = new URLSearchParams(search).getAll('code');
  if (values.length === 0) return { code: '', invalid: false };
  const parsed = roomCodeSchema.safeParse(values.length === 1 ? values[0]!.trim().toUpperCase() : null);
  return parsed.success ? { code: parsed.data, invalid: false } : { code: '', invalid: true };
}
