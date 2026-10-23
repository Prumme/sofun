import type { RegisteredGame } from '../engine/engine.js';
import { whoGame } from './who/who.js';
import { liarGame } from './liar/liar.js';
import { imagesGame } from './images/images.js';
import { drawingGame } from './drawing/drawing.js';
import { quizGame } from './quiz/quiz.js';
export const games: readonly RegisteredGame[] = [quizGame, whoGame, liarGame, imagesGame, drawingGame];
