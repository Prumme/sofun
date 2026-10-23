import { z } from 'zod';
const text = z.string().min(1).max(500);
export const partyGameIdSchema = z.enum(['who', 'liar', 'images', 'drawing']);
export const roundConfigSchema = z.object({ packId: z.string().min(1).max(100), rounds: z.number().int().min(1).max(20).default(5), resultsSeconds: z.number().int().min(5).max(60).default(10) });
export const whoConfigSchema = roundConfigSchema.extend({ voteSeconds: z.number().int().min(10).max(120).default(30) }).strict();
export const liarConfigSchema = whoConfigSchema.extend({ writingSeconds: z.number().int().min(15).max(180).default(60) }).strict();
export const imagesConfigSchema = roundConfigSchema.extend({ answerSeconds: z.number().int().min(5).max(120).default(20) }).strict();
export const drawingConfigSchema = z.object({ packId: z.string().min(1).max(100), tours: z.number().int().min(1).max(3).default(1), drawingSeconds: z.number().int().min(30).max(180).default(90), resultsSeconds: z.number().int().min(5).max(60).default(10) }).strict();
const scoped = { roundId: z.string().min(1).max(100) };
export const whoActionSchema = z.discriminatedUnion('type', [z.object({ ...scoped, type: z.literal('vote'), targetId: z.string().uuid() }).strict(), z.object({ ...scoped, type: z.literal('return-lobby') }).strict()]);
export const liarActionSchema = z.discriminatedUnion('type', [z.object({ ...scoped, type: z.literal('submit'), text: z.string().trim().min(1).max(160) }).strict(), z.object({ ...scoped, type: z.literal('vote'), choiceId: z.string().min(1).max(100) }).strict(), z.object({ ...scoped, type: z.literal('return-lobby') }).strict()]);
export const imagesActionSchema = z.discriminatedUnion('type', [z.object({ ...scoped, type: z.literal('answer'), choice: z.number().int().min(0).max(3) }).strict(), z.object({ ...scoped, type: z.literal('return-lobby') }).strict()]);
export const pointSchema = z.tuple([z.number().int().min(0).max(1024), z.number().int().min(0).max(1024)]);
export const drawingActionSchema = z.discriminatedUnion('type', [
  z.object({ ...scoped, type: z.literal('choose'), index: z.number().int().min(0).max(2) }).strict(),
  z.object({ ...scoped, type: z.literal('draw'), epoch: z.number().int().nonnegative(), sequence: z.number().int().nonnegative(), stroke: z.number().int().nonnegative(), points: z.array(pointSchema).min(1).max(50) }).strict(),
  z.object({ ...scoped, type: z.literal('clear'), epoch: z.number().int().nonnegative() }).strict(),
  z.object({ ...scoped, type: z.literal('guess'), text: z.string().trim().min(1).max(80) }).strict(),
  z.object({ ...scoped, type: z.literal('return-lobby') }).strict(),
]);
const participant = z.object({ id: z.string().uuid(), name: text, done: z.boolean() }).strict();
const result = z.object({ id: z.string().uuid(), name: text, points: z.number().int().nonnegative(), score: z.number().int().nonnegative(), rank: z.number().int().positive(), detail: z.string().max(500) }).strict();
const common = { roundId: text, roundNumber: z.number().int().positive(), totalRounds: z.number().int().positive(), deadline: z.number().nonnegative(), participants: z.array(participant), results: z.array(result) };
export const whoViewSchema = z.object({ ...common, phase: z.enum(['voting', 'revealed', 'results']), prompt: text, ownVote: z.string().nullable(), votes: z.array(z.object({ voterId: z.string(), targetId: z.string() }).strict()) }).strict();
export const liarViewSchema = z.object({ ...common, phase: z.enum(['writing', 'voting', 'revealed', 'results']), prompt: text, ownSubmission: z.string().nullable(), ownVote: z.string().nullable(), choices: z.array(z.object({ id: text, label: text, disabled: z.boolean() }).strict()), truth: z.string().nullable(), votes: z.array(z.object({ voterId: z.string(), choiceId: z.string() }).strict()), authors: z.array(z.object({ playerId: z.string(), submission: text, votes: z.number().int().nonnegative() }).strict()) }).strict();
export const imagesViewSchema = z.object({ ...common, phase: z.enum(['question', 'revealed', 'results']), prompt: text, assetId: text, choices: z.tuple([text, text, text, text]), ownAnswer: z.number().nullable(), correctChoice: z.number().nullable() }).strict();
export const drawingViewSchema = z.object({ ...common, phase: z.enum(['choosing', 'drawing', 'revealed', 'results']), drawerId: z.string(), wordOptions: z.array(text).max(3), word: z.string().nullable(), ownFound: z.boolean(), epoch: z.number().int().nonnegative(), nextSequence: z.number().int().nonnegative(), strokes: z.array(z.object({ id: z.number().int().nonnegative(), points: z.array(pointSchema).max(2000) }).strict()).max(2000) }).strict();
export const catalogueSchema = z.array(z.object({ id: z.string(), title: text, description: text, minPlayers: z.number().int().positive() }).strict());
export const packListSchema = z.array(z.object({ id: text, game: partyGameIdSchema, title: text, count: z.number().int().positive(), builtIn: z.boolean() }).strict());
export type WhoView = z.infer<typeof whoViewSchema>;
export type LiarView = z.infer<typeof liarViewSchema>;
export type ImagesView = z.infer<typeof imagesViewSchema>;
export type DrawingView = z.infer<typeof drawingViewSchema>;

export type Catalogue = z.infer<typeof catalogueSchema>;
export type PackList = z.infer<typeof packListSchema>;
