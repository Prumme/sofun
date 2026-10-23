import { z } from 'zod';

export const lanAddressSchema = z.ipv4().refine(address => {
  const [first, second] = address.split('.').map(Number);
  return first === 10 || (first === 172 && second! >= 16 && second! <= 31) || (first === 192 && second === 168);
}, 'Expected a private LAN IPv4 address');
export const networkSchema = z.object({ addresses: z.array(lanAddressSchema).max(64) }).strict();
