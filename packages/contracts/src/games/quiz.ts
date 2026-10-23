import { z } from 'zod';

export const quizConfigSchema = z.object({}).strict();
export const quizActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('answer'), questionId: z.string().min(1), choice: z.number().int().min(0).max(3) }).strict(),
  ...(['reveal', 'next', 'return-lobby'] as const).map(type => z.object({ type: z.literal(type), questionId: z.string().min(1) }).strict()),
]);
const participantSchema = z.object({ id: z.string().uuid(), name: z.string(), answered: z.boolean() }).strict();
const questionFields = {
  deadline: z.number().int().nonnegative(), questionId: z.string().min(1), questionNumber: z.number().int().min(1).max(5), totalQuestions: z.literal(5),
  prompt: z.string().min(1), choices: z.tuple([z.string(), z.string(), z.string(), z.string()]),
  participants: z.array(participantSchema), ownAnswer: z.number().int().min(0).max(3).nullable(),
};
const rankingSchema = z.array(z.object({ id: z.string().uuid(), name: z.string(), score: z.number().int().min(0).max(5), rank: z.number().int().positive() }).strict());
export const quizViewSchema = z.discriminatedUnion('phase', [
  z.object({ phase: z.literal('question'), ...questionFields }).strict(),
  z.object({ phase: z.literal('revealed'), ...questionFields, correctChoice: z.number().int().min(0).max(3),
    results: z.array(z.object({ id: z.string().uuid(), name: z.string(), answer: z.number().int().min(0).max(3).nullable(), score: z.number().int().min(0).max(1), totalScore: z.number().int().min(0).max(5) }).strict()),
  }).strict(),
  z.object({ phase: z.literal('results'), questionId: z.string().min(1), totalQuestions: z.literal(5), ranking: rankingSchema }).strict(),
]);
export type QuizAction = z.infer<typeof quizActionSchema>;
export type QuizView = z.infer<typeof quizViewSchema>;
export type QuizConfig = z.infer<typeof quizConfigSchema>;
