import type { RegisteredGame } from '../engine/engine.js';
import { quizGame } from './quiz/quiz.js';
export const games: readonly RegisteredGame[] = [quizGame];
