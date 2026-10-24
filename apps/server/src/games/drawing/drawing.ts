import { z } from 'zod';
import { drawingConfigSchema, drawingActionSchema, drawingViewSchema } from '@party/contracts';
import type { Json, DrawingView } from '@party/contracts';
import type { GameDefinition, Transition } from '@party/game-sdk';
import { defineGame } from '../../engine/engine.js';
import { drawingEntrySchema } from '../../content/schemas.js';
import { normalize, ranking, schedule, shuffled, timerMatches } from '../helpers.js';
type Config = z.infer<typeof drawingConfigSchema>; type Action = z.infer<typeof drawingActionSchema>;
export interface DrawingState { phase: DrawingView['phase']; index: number; deadline: number; config: Config; words: z.infer<typeof drawingEntrySchema>[]; options: z.infer<typeof drawingEntrySchema>[]; chosen: z.infer<typeof drawingEntrySchema> | null; players: { id: string; name: string }[]; order: string[]; found: string[]; scores: Record<string, number>; points: Record<string, number>; guesses: Record<string, number[]>; epoch: number; sequence: number; lastBatch: number; strokes: { id: number; points: [number, number][] }[] }
const roundId = (s: DrawingState) => `drawing-${s.index}`;
const drawer = (s: DrawingState) => s.order[s.index % s.order.length]!;
function result(s: DrawingState, now: number, arm = true): Transition<DrawingState, Json> { return { state: s, events: [], effects: arm && s.phase !== 'results' ? schedule(roundId(s), s.phase, s.deadline, now) : [] }; }
function reveal(s: DrawingState, now: number) {
  s.points[drawer(s)] = s.found.length * 100;
  for (const p of s.players) s.scores[p.id] = (s.scores[p.id] ?? 0) + (s.points[p.id] ?? 0);
  s.phase = 'revealed'; s.deadline = now + s.config.resultsSeconds * 1000; return result(s, now);
}
function choose(s: DrawingState, now: number, random: () => number) {
  s.options = shuffled(s.words, random).slice(0, 3); s.chosen = null; s.found = []; s.points = {}; s.guesses = {}; s.strokes = []; s.sequence = 0; s.epoch = 0; s.lastBatch = -1000;
  s.phase = 'choosing'; s.deadline = now + 15_000; return result(s, now);
}
export const drawingDefinition: GameDefinition<DrawingState, Config, Action, DrawingView, Json> = {
  id: 'drawing', actionConcurrency: 'game-validated', configSchema: drawingConfigSchema, actionSchema: drawingActionSchema, viewSchema: drawingViewSchema,
  setup(context, config) {
    if (context.players.length < 3) throw new Error('Trois joueurs sont nécessaires.');
    const words = z.array(drawingEntrySchema).parse(context.content);
    if (words.length < context.players.length * config.tours + 2) throw new Error('Pas assez de mots pour proposer trois choix sans répétition.');
    const s: DrawingState = { phase: 'choosing', index: 0, deadline: 0, config, words, options: [], chosen: null, players: context.players.map(p => ({ ...p })), order: shuffled(context.players.map(p => p.id), context.random), found: [], scores: {}, points: {}, guesses: {}, epoch: 0, sequence: 0, lastBatch: -1000, strokes: [] };
    return choose(s, context.now, context.random);
  },
  handleAction(current, action, context) {
    const s: DrawingState = structuredClone(current); if (action.roundId !== roundId(s)) return { accepted: false, reason: 'Tour inactif.' };
    if (action.type === 'return-lobby') return context.actor.role === 'host' && s.phase === 'results' ? { accepted: true, transition: { ...result(s, context.now, false), finished: true } } : { accepted: false, reason: 'Hôte et classement final requis.' };
    const id = context.actor.sessionId;
    if (context.actor.role !== 'player' || !s.players.some(p => p.id === id) || context.now >= s.deadline) return { accepted: false, reason: 'Participant ou phase invalide.' };
    if (action.type === 'choose' && s.phase === 'choosing' && id === drawer(s)) {
      s.chosen = s.options[action.index]!; s.words = s.words.filter(w => w.word !== s.chosen!.word); s.options = []; s.phase = 'drawing'; s.deadline = context.now + s.config.drawingSeconds * 1000; return { accepted: true, transition: result(s, context.now) };
    }
    if (s.phase !== 'drawing') return { accepted: false, reason: 'Le dessin n’est pas ouvert.' };
    if (action.type === 'guess' && id !== drawer(s) && !s.found.includes(id)) {
      const times = (s.guesses[id] ?? []).filter(time => time > context.now - 1000);
      if (times.length >= 3) return { accepted: false, reason: 'Trois propositions par seconde maximum.' };
      s.guesses[id] = [...times, context.now];
      if ([s.chosen!.word, ...s.chosen!.aliases].some(word => normalize(word) === normalize(action.text))) { s.found.push(id); s.points[id] = Math.floor(1000 / s.found.length); }
      return { accepted: true, transition: s.found.length === s.players.length - 1 ? reveal(s, context.now) : result(s, context.now, false) };
    }
    if (id !== drawer(s)) return { accepted: false, reason: 'Dessinateur requis.' };
    if (action.type === 'clear' && action.epoch === s.epoch) { s.epoch++; s.strokes = []; s.sequence = 0; return { accepted: true, transition: result(s, context.now, false) }; }
    if (action.type === 'draw' && action.epoch === s.epoch && action.sequence === s.sequence && context.now - s.lastBatch >= 200) {
      if (s.strokes.reduce((sum, stroke) => sum + stroke.points.length, 0) + action.points.length > 2000) return { accepted: false, reason: 'Dessin plein : effacez pour continuer.' };
      const last = s.strokes.at(-1);
      if (last && action.stroke < last.id) return { accepted: false, reason: 'Trait obsolète.' };
      if (last?.id === action.stroke) last.points.push(...action.points); else s.strokes.push({ id: action.stroke, points: [...action.points] });
      s.sequence++; s.lastBatch = context.now; return { accepted: true, transition: result(s, context.now, false) };
    }
    return { accepted: false, reason: 'Trait trop rapide ou version obsolète.' };
  },
  handleTimer(current, timer, context) {
    const s: DrawingState = structuredClone(current); if (!timerMatches(timer, roundId(s), s.phase) || s.phase === 'results') return result(s, context.now, false);
    if (context.now < s.deadline) return result(s, context.now);
    if (s.phase !== 'revealed') return reveal(s, context.now);
    if (++s.index >= s.order.length * s.config.tours) { s.index--; s.phase = 'results'; return result(s, context.now, false); }
    return choose(s, context.now, context.random);
  },
  project(s, viewer) {
    const visible = s.phase === 'revealed' || s.phase === 'results'; const isDrawer = viewer.role === 'player' && viewer.sessionId === drawer(s);
    return { phase: s.phase, roundId: roundId(s), roundNumber: s.index + 1, totalRounds: s.order.length * s.config.tours, deadline: s.deadline, drawerId: drawer(s),
      participants: s.players.map(p => ({ ...p, done: s.found.includes(p.id) })), results: visible ? ranking(s.players, s.scores, s.points) : [],
      wordOptions: isDrawer && s.phase === 'choosing' ? s.options.map(w => w.word) : [], word: visible || isDrawer ? s.chosen?.word ?? null : null,
      ownFound: s.found.includes(viewer.sessionId), epoch: s.epoch, nextSequence: isDrawer ? s.sequence : 0, strokes: s.strokes,
    };
  },
};
export const drawingGame = defineGame(drawingDefinition);
