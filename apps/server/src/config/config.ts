import { z } from 'zod';
export const environmentSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  HOST: z.string().default('0.0.0.0'),
  PUBLIC_ORIGIN: z.url().optional(),
});
export type Environment = z.infer<typeof environmentSchema>;
