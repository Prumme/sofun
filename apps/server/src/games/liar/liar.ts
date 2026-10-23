import { z } from 'zod';
import { liarConfigSchema, liarActionSchema, liarViewSchema } from '@party/contracts';
import type { Json, LiarView } from '@party/contracts';
import type { GameDefinition, Transition } from '@party/game-sdk';
import { defineGame } from '../../engine/engine.js';
import { liarEntrySchema } from '../../content/schemas.js';
import { normalize, ranking, schedule, shuffled, timerMatches } from '../helpers.js';
type Config = z.infer<typeof liarConfigSchema>; type Action = z.infer<typeof liarActionSchema>;
export interface LiarState { phase: LiarView['phase']; index: number; deadline: number; config: Config; items: z.infer<typeof liarEntrySchema>[]; players: { id: string; name: string }[]; submissions: Record<string, string>; votes: Record<string, string>; choices: { id: string; label: string; author: string | null }[]; scores: Record<string, number>; points: Record<string, number> }
const roundId = (s: LiarState) => `liar-${s.index}`;
function result(s: LiarState, now: number, arm = true): Transition<LiarState, Json> { return { state: s, events: [], effects: arm && s.phase !== 'results' ? schedule(roundId(s), s.phase, s.deadline, now) : [] }; }
function reveal(s: LiarState, now: number) {
  s.points = {}; const correct = s.choices.find(c => c.author === null)?.id;
  for (const p of s.players) {
    const attracted = Object.values(s.votes).filter(v => s.choices.find(c => c.id === v)?.author === p.id).length;
    const points = (s.votes[p.id] && s.votes[p.id] === correct ? 2 : 0) + attracted;
    s.points[p.id] = points; s.scores[p.id] = (s.scores[p.id] ?? 0) + points;
  }
  s.phase = 'revealed'; s.deadline = now + s.config.resultsSeconds * 1000; return result(s, now);
}
function voting(s: LiarState, now: number, random: () => number) {
  const raw = [{ label: s.items[s.index]!.truth, author: null as string | null }, ...Object.entries(s.submissions).map(([author, label]) => ({ label, author }))];
  s.choices = shuffled(raw, random).map((c, i) => ({ ...c, id: `${roundId(s)}-choice-${i}` }));
  if (!Object.keys(s.submissions).length) return reveal(s, now);
  s.phase = 'voting'; s.deadline = now + s.config.voteSeconds * 1000; return result(s, now);
}
export const liarDefinition: GameDefinition<LiarState, Config, Action, LiarView, Json> = {
  id: 'liar', actionConcurrency: 'game-validated', configSchema: liarConfigSchema, actionSchema: liarActionSchema, viewSchema: liarViewSchema,
  setup(context, config) {
    if (context.players.length < 3) throw new Error('Trois joueurs sont nécessaires.');
    const items = shuffled(z.array(liarEntrySchema).parse(context.content), context.random).slice(0, config.rounds);
    if (items.length !== config.rounds) throw new Error('Pas assez de questions.');
    return result({ phase: 'writing', index: 0, deadline: context.now + config.writingSeconds * 1000, config, items, players: context.players.map(p => ({ ...p })), submissions: {}, votes: {}, choices: [], scores: {}, points: {} }, context.now);
  },
  handleAction(current, action, context) {
    const s: LiarState = structuredClone(current); if (action.roundId !== roundId(s)) return { accepted: false, reason: 'Manche inactive.' };
    if (action.type === 'return-lobby') return context.actor.role === 'host' && s.phase === 'results' ? { accepted: true, transition: { ...result(s, context.now, false), finished: true } } : { accepted: false, reason: 'Hôte et classement final requis.' };
    const id = context.actor.sessionId;
    if (context.actor.role !== 'player' || !s.players.some(p => p.id === id) || context.now >= s.deadline) return { accepted: false, reason: 'Participant ou phase invalide.' };
    if (action.type === 'submit' && s.phase === 'writing' && !s.submissions[id]) {
      const item = s.items[s.index]!; const normalized = normalize(action.text);
      if (!normalized || [...Object.values(s.submissions), item.truth, ...item.aliases].some(v => normalize(v) === normalized)) return { accepted: false, reason: 'Proposition indisponible ou déjà utilisée. Essayez une autre invention.' };
      s.submissions[id] = action.text;
      return { accepted: true, transition: Object.keys(s.submissions).length === s.players.length ? voting(s, context.now, context.random) : result(s, context.now, false) };
    }
    if (action.type === 'vote' && s.phase === 'voting' && !s.votes[id]) {
      const choice = s.choices.find(c => c.id === action.choiceId);
      if (!choice || choice.author === id) return { accepted: false, reason: 'Impossible de voter pour votre invention.' };
      s.votes[id] = choice.id; return { accepted: true, transition: Object.keys(s.votes).length === s.players.length ? reveal(s, context.now) : result(s, context.now, false) };
    }
    return { accepted: false, reason: 'Action indisponible.' };
  },
  handleTimer(current, timer, context) {
    const s: LiarState = structuredClone(current); if (!timerMatches(timer, roundId(s), s.phase) || s.phase === 'results') return result(s, context.now, false);
    if (context.now < s.deadline) return result(s, context.now);
    if (s.phase === 'writing') return voting(s, context.now, context.random);
    if (s.phase === 'voting') return reveal(s, context.now);
    if (++s.index >= s.items.length) { s.index--; s.phase = 'results'; return result(s, context.now, false); }
    s.phase = 'writing'; s.submissions = {}; s.votes = {}; s.choices = []; s.points = {}; s.deadline = context.now + s.config.writingSeconds * 1000; return result(s, context.now);
  },
  project(s, viewer) {
    const visible = s.phase === 'revealed' || s.phase === 'results';
    return { phase: s.phase, roundId: roundId(s), roundNumber: s.index + 1, totalRounds: s.items.length, deadline: s.deadline, prompt: s.items[s.index]!.question,
      participants: s.players.map(p => ({ ...p, done: Boolean(s.phase === 'writing' ? s.submissions[p.id] : s.votes[p.id]) })),
      ownSubmission: viewer.role === 'player' ? s.submissions[viewer.sessionId] ?? null : null, ownVote: viewer.role === 'player' ? s.votes[viewer.sessionId] ?? null : null,
      choices: s.phase === 'writing' ? [] : s.choices.map(c => ({ id: c.id, label: c.label, disabled: c.author === viewer.sessionId })),
      truth: visible ? s.items[s.index]!.truth : null, votes: visible ? Object.entries(s.votes).map(([voterId, choiceId]) => ({ voterId, choiceId })) : [], authors: visible ? Object.entries(s.submissions).map(([playerId, submission]) => ({ playerId, submission, votes: Object.values(s.votes).filter(v => s.choices.find(c => c.id === v)?.author === playerId).length })) : [],
      results: visible ? ranking(s.players, s.scores, s.points) : [],
    };
  },
};
export const liarGame = defineGame(liarDefinition);
