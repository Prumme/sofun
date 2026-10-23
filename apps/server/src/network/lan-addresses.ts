import type { networkInterfaces } from 'node:os';
import { lanAddressSchema } from '@party/contracts';

export function getLanAddresses(interfaces: ReturnType<typeof networkInterfaces>): string[] {
  const addresses = Object.values(interfaces).flatMap(entries => entries ?? [])
    .filter(info => !info.internal && info.family === 'IPv4' && lanAddressSchema.safeParse(info.address).success)
    .map(info => info.address);
  return [...new Set(addresses)].sort().slice(0, 64);
}
