import { z } from 'zod';

export const idSchema = z.string().uuid();
export const roomCodeSchema = z.string().regex(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
export const jsonSchema = z.json();
export type Json = z.infer<typeof jsonSchema>;
export const requestSchema = z.object({ requestId: idSchema });
export const commandSchemas = {
  'room:create': requestSchema.strict(),
  'room:join': requestSchema.extend({ code: roomCodeSchema, name: z.string().trim().min(1).max(32) }).strict(),
  'room:leave': requestSchema.strict(),
  'room:close': requestSchema.strict(),
  'session:resume': requestSchema.extend({ roomId: idSchema, sessionId: idSchema, token: z.string().regex(/^[a-f0-9]{64}$/) }).strict(),
  'game:start': requestSchema.extend({ gameId: z.string().min(1).max(64), config: jsonSchema }).strict(),
  'game:action': requestSchema.extend({ gameId: idSchema, revision: z.number().int().nonnegative(), action: jsonSchema }).strict(),
} as const;
export type CommandName = keyof typeof commandSchemas;
export type Command<N extends CommandName = CommandName> = z.infer<(typeof commandSchemas)[N]>;
export const commandNames = Object.keys(commandSchemas) as CommandName[];
export const errorCodeSchema = z.enum(['INVALID_MESSAGE', 'INVALID_SESSION', 'FORBIDDEN', 'ROOM_NOT_FOUND', 'INVALID_PHASE', 'STALE_STATE', 'ACTION_REJECTED', 'REQUEST_CONFLICT', 'INTERNAL_ERROR']);
export type ErrorCode = z.infer<typeof errorCodeSchema>;
export const credentialsSchema = z.object({ roomId: idSchema, sessionId: idSchema, token: z.string().regex(/^[a-f0-9]{64}$/) }).strict();
export type Credentials = z.infer<typeof credentialsSchema>;
export const snapshotSchema = z.object({
  roomId: idSchema, code: roomCodeSchema, phase: z.enum(['lobby', 'playing', 'closed']),
  revision: z.number().int().nonnegative(),
  players: z.array(z.object({ id: idSchema, name: z.string(), connected: z.boolean() }).strict()),
  viewer: z.object({ role: z.enum(['host', 'player']), sessionId: idSchema }).strict(),
  game: z.object({ id: idSchema, type: z.string(), view: jsonSchema }).strict().nullable(),
}).strict();
export type Snapshot = z.infer<typeof snapshotSchema>;
export const responseSchema = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true), requestId: idSchema, credentials: credentialsSchema.optional() }).strict(),
  z.object({ ok: z.literal(false), requestId: idSchema, error: z.object({ code: errorCodeSchema, message: z.string() }).strict() }).strict(),
]);
export type CommandResponse = z.infer<typeof responseSchema>;
export const healthSchema = z.object({ status: z.literal('ok') }).strict();

export { quizConfigSchema, quizActionSchema, quizViewSchema } from './games/quiz.js';
export type { QuizConfig, QuizAction, QuizView } from './games/quiz.js';

export { lanAddressSchema, networkSchema } from './network.js';
