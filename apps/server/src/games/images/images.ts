import { z } from 'zod';
import { imagesConfigSchema, imagesActionSchema, imagesViewSchema } from '@party/contracts';
import type { Json, ImagesView } from '@party/contracts';
import type { GameDefinition, Transition } from '@party/game-sdk';
import { defineGame } from '../../engine/engine.js';
import { imageEntrySchema } from '../../content/schemas.js';
import { ranking, schedule, shuffled, timerMatches } from '../helpers.js';
type Config = z.infer<typeof imagesConfigSchema>; type Action = z.infer<typeof imagesActionSchema>;
export interface ImagesState { phase: ImagesView['phase']; index: number; deadline: number; config: Config; items: z.infer<typeof imageEntrySchema>[]; players: { id: string; name: string }[]; answers: Record<string, number>; scores: Record<string, number>; points: Record<string, number>; correctCount: number }
const roundId = (s: ImagesState) => `images-${s.index}`;
function result(s: ImagesState, now: number, arm = true): Transition<ImagesState, Json> { return { state: s, events: [], effects: arm && s.phase !== 'results' ? schedule(roundId(s), s.phase, s.deadline, now) : [] }; }
function reveal(s: ImagesState, now: number) { for (const p of s.players) s.scores[p.id] = (s.scores[p.id] ?? 0) + (s.points[p.id] ?? 0); s.phase = 'revealed'; s.deadline = now + s.config.resultsSeconds * 1000; return result(s, now); }
export const imagesDefinition: GameDefinition<ImagesState, Config, Action, ImagesView, Json> = {
  id: 'images', actionConcurrency: 'game-validated', configSchema: imagesConfigSchema, actionSchema: imagesActionSchema, viewSchema: imagesViewSchema,
  setup(context, config) {
    if (context.players.length < 2) throw new Error('Deux joueurs sont nécessaires.');
    const items = shuffled(z.array(imageEntrySchema).parse(context.content), context.random).slice(0, config.rounds).map(item => {
      const correct = item.correctIndex; const indices = shuffled([0, 1, 2, 3], context.random); return { ...item, choices: indices.map(i => item.choices[i]!) as [string, string, string, string], correctIndex: indices.indexOf(correct) };
    });
    if (items.length !== config.rounds) throw new Error('Pas assez d’images.');
    return result({ phase: 'question', index: 0, deadline: context.now + config.answerSeconds * 1000, config, items, players: context.players.map(p => ({ ...p })), answers: {}, scores: {}, points: {}, correctCount: 0 }, context.now);
  },
  handleAction(current, action, context) {
    const s: ImagesState = structuredClone(current); if (action.roundId !== roundId(s)) return { accepted: false, reason: 'Manche inactive.' };
    if (action.type === 'return-lobby') return context.actor.role === 'host' && s.phase === 'results' ? { accepted: true, transition: { ...result(s, context.now, false), finished: true } } : { accepted: false, reason: 'Hôte et classement final requis.' };
    const id = context.actor.sessionId;
    if (context.actor.role !== 'player' || !s.players.some(p => p.id === id) || s.phase !== 'question' || context.now >= s.deadline || Object.hasOwn(s.answers, id)) return { accepted: false, reason: 'Réponse indisponible.' };
    s.answers[id] = action.choice; if (action.choice === s.items[s.index]!.correctIndex) s.points[id] = Math.floor(1000 / ++s.correctCount);
    return { accepted: true, transition: Object.keys(s.answers).length === s.players.length ? reveal(s, context.now) : result(s, context.now, false) };
  },
  handleTimer(current, timer, context) {
    const s: ImagesState = structuredClone(current); if (!timerMatches(timer, roundId(s), s.phase) || s.phase === 'results') return result(s, context.now, false);
    if (context.now < s.deadline) return result(s, context.now);
    if (s.phase === 'question') return reveal(s, context.now);
    if (++s.index >= s.items.length) { s.index--; s.phase = 'results'; return result(s, context.now, false); }
    s.phase = 'question'; s.answers = {}; s.points = {}; s.correctCount = 0; s.deadline = context.now + s.config.answerSeconds * 1000; return result(s, context.now);
  },
  project(s, viewer) {
    const item = s.items[s.index]!; const visible = s.phase !== 'question';
    return { phase: s.phase, roundId: roundId(s), roundNumber: s.index + 1, totalRounds: s.items.length, deadline: s.deadline, prompt: item.question, assetId: item.image, choices: item.choices,
      participants: s.players.map(p => ({ ...p, done: Object.hasOwn(s.answers, p.id) })), ownAnswer: viewer.role === 'player' ? s.answers[viewer.sessionId] ?? null : null,
      correctChoice: visible ? item.correctIndex : null, results: visible ? ranking(s.players, s.scores, s.points) : [],
    };
  },
};
export const imagesGame = defineGame(imagesDefinition);
