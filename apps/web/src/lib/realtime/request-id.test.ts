import { afterEach, expect, it, vi } from 'vitest';
import { idSchema } from '@party/contracts';
import { createRequestId } from './request-id';
afterEach(() => vi.unstubAllGlobals());
it('generates unique valid UUIDs without the HTTPS-only randomUUID API', () => {
  const getRandomValues = crypto.getRandomValues.bind(crypto);
  vi.stubGlobal('crypto', { getRandomValues });
  const ids = Array.from({ length: 100 }, createRequestId);
  expect(new Set(ids).size).toBe(100);
  for (const id of ids) expect(idSchema.safeParse(id).success).toBe(true);
});
