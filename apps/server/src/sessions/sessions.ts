import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import type { Viewer } from '@party/game-sdk';
export interface Session {
  id: string;
  role: Viewer['role'];
  name: string;
  tokenHash: string;
  connectionId: string | null;
}
export function hashToken(token: string): string { return createHash('sha256').update(token).digest('hex'); }
export function createSession(role: Session['role'], name: string, connectionId: string): { session: Session; token: string } {
  const token = randomBytes(32).toString('hex');
  return { session: { id: randomUUID(), role, name, tokenHash: hashToken(token), connectionId }, token };
}
export function verifyToken(session: Session, token: string): boolean {
  return timingSafeEqual(Buffer.from(session.tokenHash, 'hex'), Buffer.from(hashToken(token), 'hex'));
}
export function viewerFor(session: Session): Viewer { return { role: session.role, sessionId: session.id }; }
