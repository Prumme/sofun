import { z } from 'zod';
import { whoConfigSchema, whoActionSchema, whoViewSchema } from '@party/contracts';
import type { Json, WhoView } from '@party/contracts';
import type { GameDefinition, Transition } from '@party/game-sdk';
import { defineGame } from '../../engine/engine.js';
import { whoEntrySchema } from '../../content/schemas.js';
import { ranking, schedule, shuffled, timerMatches } from '../helpers.js';
type Config = z.infer<typeof whoConfigSchema>; type Action = z.infer<typeof whoActionSchema>;
export interface WhoState { phase: WhoView['phase']; index: number; deadline: number; config: Config; items: { question: string }[]; players: { id: string; name: string }[]; votes: Record<string, string>; scores: Record<string, number>; points: Record<string, number> }
const roundId = (s: WhoState) => `who-${s.index}`;
function result(s: WhoState, now: number, arm = true): Transition<WhoState, Json> { return { state: s, events: [], effects: arm && s.phase !== 'results' ? schedule(roundId(s), s.phase, s.deadline, now) : [] }; }
function reveal(s: WhoState, now: number) {
  const totals: Record<string, number> = {}; for (const target of Object.values(s.votes)) totals[target] = (totals[target] ?? 0) + 1;
  const max = Math.max(0, ...Object.values(totals)); s.points = {};
  for (const player of s.players) { const target = s.votes[player.id]; const point = target && max > 0 && totals[target] === max ? 1 : 0; s.points[player.id] = point; s.scores[player.id] = (s.scores[player.id] ?? 0) + point; }
  s.phase = 'revealed'; s.deadline = now + s.config.resultsSeconds * 1000; return result(s, now);
}
export const whoDefinition: GameDefinition<WhoState, Config, Action, WhoView, Json> = {
  id: 'who', actionConcurrency: 'game-validated', configSchema: whoConfigSchema, actionSchema: whoActionSchema, viewSchema: whoViewSchema,
  setup(context, config) {
    if (context.players.length < 2) throw new Error('Deux joueurs sont nécessaires.');
    const items = shuffled(z.array(whoEntrySchema).parse(context.content), context.random).slice(0, config.rounds);
    if (items.length !== config.rounds) throw new Error('Pas assez de questions.');
    return result({ phase: 'voting', index: 0, deadline: context.now + config.voteSeconds * 1000, config, items, players: context.players.map(p => ({ ...p })), votes: {}, scores: {}, points: {} }, context.now);
  },
  handleAction(current, action, context) {
    const s: WhoState = structuredClone(current); if (action.roundId !== roundId(s)) return { accepted: false, reason: 'Manche inactive.' };
    if (action.type === 'return-lobby') return context.actor.role === 'host' && s.phase === 'results' ? { accepted: true, transition: { ...result(s, context.now, false), finished: true } } : { accepted: false, reason: 'Hôte et classement final requis.' };
    const id = context.actor.sessionId;
    if (context.actor.role !== 'player' || !s.players.some(p => p.id === id) || s.phase !== 'voting' || context.now >= s.deadline || s.votes[id] || !s.players.some(p => p.id === action.targetId)) return { accepted: false, reason: 'Vote indisponible.' };
    s.votes[id] = action.targetId;
    return { accepted: true, transition: Object.keys(s.votes).length === s.players.length ? reveal(s, context.now) : result(s, context.now, false) };
  },
  handleTimer(current, timer, context) {
    const s: WhoState = structuredClone(current); if (!timerMatches(timer, roundId(s), s.phase) || s.phase === 'results') return result(s, context.now, false);
    if (context.now < s.deadline) return result(s, context.now);
    if (s.phase === 'voting') return reveal(s, context.now);
    if (++s.index >= s.items.length) { s.index--; s.phase = 'results'; return result(s, context.now, false); }
    s.phase = 'voting'; s.votes = {}; s.points = {}; s.deadline = context.now + s.config.voteSeconds * 1000; return result(s, context.now);
  },
  project(s, viewer) {
    const visible = s.phase !== 'voting';
    return { phase: s.phase, roundId: roundId(s), roundNumber: s.index + 1, totalRounds: s.items.length, deadline: s.deadline, prompt: s.items[s.index]!.question,
      participants: s.players.map(p => ({ ...p, done: Boolean(s.votes[p.id]) })), ownVote: viewer.role === 'player' ? s.votes[viewer.sessionId] ?? null : null,
      votes: visible ? Object.entries(s.votes).map(([voterId, targetId]) => ({ voterId, targetId })) : [],
      results: visible ? ranking(s.players, s.scores, s.points, Object.fromEntries(s.players.map(p => [p.id, `${Object.values(s.votes).filter(v => v === p.id).length} vote(s)`]))) : [],
    };
  },
};
export const whoGame = defineGame(whoDefinition);
