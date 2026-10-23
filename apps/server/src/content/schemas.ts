import { z } from 'zod';
const label = z.string().trim().min(1).max(500);
export const whoEntrySchema = z.object({ question: label }).strict();
export const liarEntrySchema = z.object({ question: label, truth: label, aliases: z.array(label).max(20).default([]) }).strict();
export const imageEntrySchema = z.object({ question: label, image: z.string().min(1).max(150), choices: z.tuple([label, label, label, label]), correctIndex: z.number().int().min(0).max(3) }).strict();
export const drawingEntrySchema = z.object({ word: z.string().trim().min(1).max(80), aliases: z.array(z.string().trim().min(1).max(80)).max(20).default([]) }).strict();
const base = { version: z.literal(1), title: label };
export const manifestSchema = z.discriminatedUnion('game', [
  z.object({ ...base, game: z.literal('who'), items: z.array(whoEntrySchema).min(1).max(500) }).strict(),
  z.object({ ...base, game: z.literal('liar'), items: z.array(liarEntrySchema).min(1).max(500) }).strict(),
  z.object({ ...base, game: z.literal('images'), items: z.array(imageEntrySchema).min(1).max(500) }).strict(),
  z.object({ ...base, game: z.literal('drawing'), items: z.array(drawingEntrySchema).min(3).max(1000) }).strict(),
]);
export type Manifest = z.infer<typeof manifestSchema>;
