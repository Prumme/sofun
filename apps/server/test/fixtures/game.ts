import { z } from 'zod';
import type { GameDefinition } from '@party/game-sdk';
import { defineGame } from '../../src/engine/engine.js';
interface State { count: number; secrets: Record<string, string> }
const actionSchema = z.discriminatedUnion('type', [z.object({ type: z.literal('increment') }).strict(), z.object({ type: z.literal('finish') }).strict()]);
type Action = z.infer<typeof actionSchema>;
export const fixtureDefinition: GameDefinition<State, { timed: boolean }, Action, { count: number; secret: string | null }, 'tick'> = {
  id: 'fixture-counter',
  configSchema: z.object({ timed: z.boolean() }).strict(),
  actionSchema,
  viewSchema: z.object({ count: z.number(), secret: z.string().nullable() }).strict(),
  setup(context, config) {
    return { state: { count: 0, secrets: Object.fromEntries(context.players.map(player => [player.id, `secret-${player.id}`])) },
      events: [], effects: config.timed ? [{ type: 'schedule', key: 'tick', delayMs: 1000, timer: 'tick' }] : [] };
  },
  handleAction(state, action, context) {
    if (action.type === 'finish') {
      if (context.actor.role !== 'host') return { accepted: false, reason: 'Hôte requis.' };
      return { accepted: true, transition: { state: { ...state }, events: [], effects: [], finished: true } };
    }
    if (context.actor.role !== 'player') return { accepted: false, reason: 'Joueur requis.' };
    return { accepted: true, transition: { state: { ...state, count: state.count + 1 }, events: [], effects: [] } };
  },
  handleTimer(state) { return { state: { ...state, count: state.count + 1 }, events: [], effects: [] }; },
  project(state, viewer) { return { count: state.count, secret: viewer.role === 'player' ? state.secrets[viewer.sessionId] ?? null : null }; },
};
export const fixtureGame = defineGame(fixtureDefinition);
