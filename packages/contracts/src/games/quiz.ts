import { z } from 'zod';

export const quizConfigSchema = z.object({}).strict();
export const quizActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('answer'), questionId: z.string().min(1), choice: z.number().int().min(0).max(3) }).strict(),
  z.object({ type: z.literal('reveal'), questionId: z.string().min(1) }).strict(),
]);
const participantSchema = z.object({ id: z.string().uuid(), name: z.string(), answered: z.boolean() }).strict();
const questionFields = {
  questionId: z.string().min(1), prompt: z.string().min(1), choices: z.tuple([z.string(), z.string(), z.string(), z.string()]),
  participants: z.array(participantSchema), ownAnswer: z.number().int().min(0).max(3).nullable(),
};
export const quizViewSchema = z.discriminatedUnion('phase', [
  z.object({ phase: z.literal('question'), ...questionFields }).strict(),
  z.object({ phase: z.literal('revealed'), ...questionFields, correctChoice: z.number().int().min(0).max(3),
    results: z.array(z.object({ id: z.string().uuid(), name: z.string(), answer: z.number().int().min(0).max(3).nullable(), score: z.number().int().min(0).max(1) }).strict()),
  }).strict(),
]);
export type QuizAction = z.infer<typeof quizActionSchema>;
export type QuizView = z.infer<typeof quizViewSchema>;
export type QuizConfig = z.infer<typeof quizConfigSchema>;
