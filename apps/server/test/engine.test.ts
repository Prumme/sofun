import { describe, expect, it } from 'vitest';
import { Engine } from '../src/engine/engine.js';
import { fixtureDefinition, fixtureGame } from './fixtures/game.js';
const context = { now: 123, players: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], random: () => .5 };
describe('game engine', () => {
  it('is deterministic and projects only the authorized secret', () => {
    const first = fixtureDefinition.setup(context, { timed: false });
    expect(first).toEqual(fixtureDefinition.setup(context, { timed: false }));
    expect(fixtureGame.project(first.state, { role: 'host', sessionId: 'host' })).toEqual({ count: 0, secret: null });
    expect(fixtureGame.project(first.state, { role: 'player', sessionId: 'a' })).toEqual({ count: 0, secret: 'secret-a' });
  });
  it('rejects an unauthorized or malformed action without changing the state', () => {
    const state = fixtureDefinition.setup(context, { timed: false }).state;
    expect(() => fixtureGame.act(state, { type: 'increment' }, { ...context, actor: { role: 'host', sessionId: 'host' } })).toThrow();
    expect(() => fixtureGame.act(state, { type: 'finish', score: 999 }, { ...context, actor: { role: 'host', sessionId: 'host' } })).toThrow();
    expect(state.count).toBe(0);
    expect(fixtureGame.tick(state, 'tick', context).state).toMatchObject({ count: 1 });
    expect(state.count).toBe(0);
  });
  it('checks registry and timers', () => {
    expect(() => new Engine([fixtureGame, fixtureGame])).toThrow();
    expect(() => new Engine().definition('unknown')).toThrow();
    expect(() => new Engine().validateEffects([{ type: 'schedule', key: 'bad', delayMs: -1, timer: null }])).toThrow();
  });
});
