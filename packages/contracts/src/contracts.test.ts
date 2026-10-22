import { describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { commandSchemas, snapshotSchema } from './index.js';
describe('network schemas', () => {
  it('validates commands and rejects untrusted fields and malformed codes', () => {
    expect(commandSchemas['room:join'].safeParse({ requestId: randomUUID(), code: 'ABC234', name: ' A ' }).data?.name).toBe('A');
    expect(commandSchemas['room:join'].safeParse({ requestId: randomUUID(), code: 'localhost', name: 'A' }).success).toBe(false);
    expect(commandSchemas['game:action'].safeParse({ requestId: randomUUID(), gameId: randomUUID(), revision: 0, action: {}, role: 'host' }).success).toBe(false);
  });
  it('rejects internal state accidentally added to a snapshot', () => {
    expect(snapshotSchema.safeParse({ state: { secret: true } }).success).toBe(false);
  });
});
