import type { NetworkInterfaceInfo } from 'node:os';
import type { AddressInfo } from 'node:net';
import { expect, it } from 'vitest';
import { networkSchema } from '@party/contracts';
import { getLanAddresses } from '../src/network/lan-addresses.js';
import { createApplication } from '../src/bootstrap.js';

it('lists unique private IPv4 candidates without loopback, public addresses or interface details', () => {
  const info = (address: string, internal = false): NetworkInterfaceInfo => ({ address, internal, family: 'IPv4', netmask: '255.255.255.0', mac: '00:00:00:00:00:00', cidr: null });
  expect(getLanAddresses({ en0: [info('192.168.1.23'), info('192.168.1.23'), info('127.0.0.1', true), info('8.8.8.8'), info('172.32.0.2')], vpn: [info('10.8.0.2'), info('172.16.0.2')], empty: undefined })).toEqual(['10.8.0.2', '172.16.0.2', '192.168.1.23']);
  expect(getLanAddresses({})).toEqual([]);
});

it('serves a validated discovery response through the real HTTP endpoint without caching', async () => {
  const app = await createApplication([], false);
  try {
    await app.listen(0, '127.0.0.1');
    const port = (app.getHttpServer().address() as AddressInfo).port;
    const response = await fetch(`http://127.0.0.1:${port}/api/network`);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(networkSchema.safeParse(await response.json()).success).toBe(true);
  } finally { await app.close(); }
});
