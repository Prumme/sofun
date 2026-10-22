import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CommandName, Credentials, Snapshot } from '@party/contracts';
import { Rooms } from '../src/rooms/rooms.js';
import { Engine, defineGame } from '../src/engine/engine.js';
import { MemoryRoomStore } from '../src/storage/room-store.js';
import { fixtureGame, fixtureDefinition } from './fixtures/game.js';
let rooms: Rooms;
let store: MemoryRoomStore;
let views: Map<string, Snapshot>;
const replaced: string[] = [];
async function command(connection: string, name: CommandName, payload: Record<string, unknown> = {}, requestId = randomUUID()) {
  return rooms.command(connection, name, { requestId, ...payload });
}
async function create(connection = 'host'): Promise<Credentials> {
  const response = await command(connection, 'room:create');
  if (!response.ok || !response.credentials) throw new Error('Creation failed');
  return response.credentials;
}
async function join(connection: string, host = 'host'): Promise<Credentials> {
  const response = await command(connection, 'room:join', { code: views.get(host)!.code, name: connection });
  if (!response.ok || !response.credentials) throw new Error('Join failed');
  return response.credentials;
}
beforeEach(() => {
  vi.useFakeTimers();
  store = new MemoryRoomStore(); rooms = new Rooms(store, new Engine([fixtureGame, defineGame({ ...fixtureDefinition, id: 'rejecting-view', viewSchema: fixtureDefinition.viewSchema.refine(view => view.count === 0) })])); views = new Map(); replaced.length = 0;
  rooms.setEvents({ snapshot: (id, view) => views.set(id, view), replace: id => { replaced.push(id); } });
});
afterEach(() => { rooms.dispose(); vi.useRealTimers(); });
describe('rooms and sessions', () => {
  it('isolates rooms, serializes actions and deduplicates requests', async () => {
    await create(); await create('other-host'); await join('alice'); await join('bob');
    await command('host', 'game:start', { gameId: fixtureGame.id, config: { timed: false } });
    const view = views.get('alice')!;
    expect(JSON.stringify(views.get('host'))).not.toContain('secret-');
    expect(JSON.stringify(views.get('alice'))).not.toContain('secret-' + views.get('bob')!.viewer.sessionId);
    const requestId = randomUUID();
    const action = { gameId: view.game!.id, revision: view.revision, action: { type: 'increment' } };
    const responses = await Promise.all([command('alice', 'game:action', action, requestId), command('alice', 'game:action', action, requestId)]);
    expect(responses[0]).toEqual(responses[1]); expect(responses[0]?.ok).toBe(true);
    expect(views.get('alice')!.game!.view).toMatchObject({ count: 1 });
    expect(views.get('other-host')!.game).toBeNull();
    const conflict = await command('alice', 'game:action', { ...action, action: { type: 'finish' } }, requestId);
    expect(conflict).toMatchObject({ ok: false, error: { code: 'REQUEST_CONFLICT' } });
    expect(await command('bob', 'game:action', action)).toMatchObject({ ok: false, error: { code: 'STALE_STATE' } });
    expect(await command('new', 'room:join', { code: view.code, name: 'new' })).toMatchObject({ ok: false, error: { code: 'INVALID_PHASE' } });
  });
  it('keeps deduplication across reconnection and rejects bad projections atomically', async () => {
    await create(); const credentials = await join('alice');
    await command('host', 'game:start', { gameId: fixtureGame.id, config: { timed: false } });
    const view = views.get('alice')!;
    const payload = { gameId: view.game!.id, revision: view.revision, action: { type: 'increment' } };
    const requestId = randomUUID();
    const response = await command('alice', 'game:action', payload, requestId);
    await rooms.disconnect('alice');
    await command('alice2', 'session:resume', credentials);
    expect(await command('alice2', 'game:action', payload, requestId)).toEqual(response);
    expect(views.get('alice2')!.game!.view).toMatchObject({ count: 1 });
    const hostView = views.get('host')!;
    await command('host', 'game:action', { gameId: hostView.game!.id, revision: hostView.revision, action: { type: 'finish' } });
    await command('host', 'game:start', { gameId: 'rejecting-view', config: { timed: false } });
    const before = views.get('alice2')!;
    expect(await command('alice2', 'game:action', { gameId: before.game!.id, revision: before.revision, action: { type: 'increment' } })).toMatchObject({ ok: false });
    expect(store.get(before.roomId)!.revision).toBe(before.revision);
    expect(store.get(before.roomId)!.game!.state).toMatchObject({ count: 0 });
    expect(views.get('alice2')).toEqual(before);
  });
  it('replaces connections and rejects invalid credentials and forged roles', async () => {
    const credentials = await create();
    expect(await command('bad', 'session:resume', { ...credentials, token: '0'.repeat(64) })).toMatchObject({ ok: false, error: { code: 'INVALID_SESSION' } });
    expect(await command('new-host', 'session:resume', credentials)).toMatchObject({ ok: true });
    expect(replaced).toEqual(['host']);
    await rooms.disconnect('host');
    expect(store.get(credentials.roomId)!.sessions.get(credentials.sessionId)!.connectionId).toBe('new-host');
    expect(await command('host', 'room:close')).toMatchObject({ ok: false, error: { code: 'INVALID_SESSION' } });
    await join('player', 'new-host');
    expect(await command('player', 'room:close')).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } });
    expect(await command('player', 'room:close', { role: 'host' })).toMatchObject({ ok: false, error: { code: 'INVALID_MESSAGE' } });
  });
  it('expires only after two continuous hours without any connection', async () => {
    const credentials = await create();
    await rooms.disconnect('host');
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
    await command('new-host', 'session:resume', credentials);
    await vi.advanceTimersByTimeAsync(2 * 60 * 60 * 1000);
    expect(store.get(credentials.roomId)).toBeDefined();
    await rooms.disconnect('new-host');
    await vi.advanceTimersByTimeAsync(2 * 60 * 60 * 1000);
    expect(store.get(credentials.roomId)).toBeUndefined();
    expect(await command('again', 'session:resume', credentials)).toMatchObject({ ok: false, error: { code: 'ROOM_NOT_FOUND' } });
  });
  it('continues timers without host and cancels them on game completion or room closure', async () => {
    const credentials = await create(); await join('alice');
    await command('host', 'game:start', { gameId: fixtureGame.id, config: { timed: true } });
    await rooms.disconnect('host'); await vi.advanceTimersByTimeAsync(1000);
    expect(views.get('alice')!.game!.view).toMatchObject({ count: 1 });
    await command('host2', 'session:resume', credentials);
    const view = views.get('host2')!;
    expect(await command('host2', 'game:action', { gameId: view.game!.id, revision: view.revision, action: { type: 'finish' } })).toMatchObject({ ok: true });
    expect(views.get('alice')!.phase).toBe('lobby');
    await command('host2', 'game:start', { gameId: fixtureGame.id, config: { timed: true } });
    await command('host2', 'room:close');
    await vi.advanceTimersByTimeAsync(2000);
    expect(views.get('alice')!.phase).toBe('closed'); expect(store.get(credentials.roomId)).toBeUndefined();
  });
  it('preserves disconnected players, removes explicit departures and invalidates their resume', async () => {
    await create(); const player = await join('alice');
    await command('host', 'game:start', { gameId: fixtureGame.id, config: { timed: false } });
    await command('alice', 'room:leave');
    expect(await command('alice2', 'session:resume', player)).toMatchObject({ ok: false, error: { code: 'INVALID_SESSION' } });
    expect(views.get('host')!.players).toHaveLength(1);
    const view = views.get('host')!;
    await command('host', 'game:action', { gameId: view.game!.id, revision: view.revision, action: { type: 'finish' } });
    expect(views.get('host')!.players).toHaveLength(0);
  });
});
