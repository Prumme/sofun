import { expect, it } from 'vitest';
import { lanAddressSchema, networkSchema } from './network.js';

it('accepts private IPv4 addresses and refuses other hosts and malformed discovery payloads', () => {
  for (const address of ['10.0.0.1', '172.16.0.1', '172.31.255.254', '192.168.1.23']) expect(lanAddressSchema.safeParse(address).success).toBe(true);
  for (const address of ['127.0.0.1', '0.0.0.0', '172.15.0.1', '172.32.0.1', '169.254.1.2', '8.8.8.8', '::1', 'fd00::1', 'localhost', '192.168.1.999']) expect(lanAddressSchema.safeParse(address).success).toBe(false);
  expect(networkSchema.safeParse({ addresses: [] }).success).toBe(true);
  expect(networkSchema.safeParse({ addresses: Array(65).fill('10.0.0.1') }).success).toBe(false);
  expect(networkSchema.safeParse({ addresses: ['192.168.1.23'], mac: 'private' }).success).toBe(false);
});
