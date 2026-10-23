import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { quizActionSchema, quizViewSchema } from '@party/contracts';
import type { CommandName, Snapshot } from '@party/contracts';
import { Rooms } from '../src/rooms/rooms.js';
import { Engine } from '../src/engine/engine.js';
import { MemoryRoomStore } from '../src/storage/room-store.js';
import { quizGame } from '../src/games/quiz/quiz.js';

let rooms: Rooms;
let views: Map<string, Snapshot>;
function command(actor: string, name: CommandName, data: Record<string, unknown> = {}, requestId = randomUUID()) {
  return rooms.command(actor, name, { requestId, ...data });
}
function view(actor: string) { return quizViewSchema.parse(views.get(actor)!.game!.view); }
function action(actor: string, value: unknown, snapshot = views.get(actor)!, requestId = randomUUID()) {
  return command(actor, 'game:action', { gameId: snapshot.game!.id, revision: snapshot.revision, action: value }, requestId);
}
async function lobby() {
  await command('host', 'room:create');
  for (const name of ['Alice', 'Bob']) expect(await command(name, 'room:join', { code: views.get('host')!.code, name })).toMatchObject({ ok: true });
}
async function start() {
  await lobby();
  expect(await command('host', 'game:start', { gameId: 'quiz', config: {} })).toMatchObject({ ok: true });
}
beforeEach(() => {
  rooms = new Rooms(new MemoryRoomStore(), new Engine([quizGame]));
  views = new Map();
  rooms.setEvents({ snapshot: (id, snapshot) => views.set(id, snapshot), replace: () => {} });
});
afterEach(() => rooms.dispose());

describe('first quiz question', () => {
  it('requires a host, two players and an empty validated configuration', async () => {
    await command('host', 'room:create');
    expect(await command('host', 'game:start', { gameId: 'quiz', config: {} })).toMatchObject({ ok: false });
    await command('Alice', 'room:join', { code: views.get('host')!.code, name: 'Alice' });
    expect(await command('host', 'game:start', { gameId: 'quiz', config: {} })).toMatchObject({ ok: false });
    await command('Bob', 'room:join', { code: views.get('host')!.code, name: 'Bob' });
    expect(await command('Alice', 'game:start', { gameId: 'quiz', config: {} })).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } });
    expect(await command('host', 'game:start', { gameId: 'quiz', config: { correctChoice: 0 } })).toMatchObject({ ok: false });
    expect(await command('host', 'game:start', { gameId: 'quiz', config: {} })).toMatchObject({ ok: true });
  });
  it('accepts simultaneous answers from the same revision and reveals server-calculated points exactly once', async () => {
    await start();
    const before = views.get('host')!;
    const questionId = view('host').questionId;
    const responses = await Promise.all([
      action('Alice', { type: 'answer', questionId, choice: 1 }, before),
      action('Bob', { type: 'answer', questionId, choice: 2 }, before),
    ]);
    expect(responses.every(response => response.ok)).toBe(true);
    expect(view('host').participants.every(player => player.answered)).toBe(true);
    expect(await action('host', { type: 'reveal', questionId }, before)).toMatchObject({ ok: true });
    for (const actor of ['host', 'Alice', 'Bob']) {
      expect(view(actor)).toMatchObject({ phase: 'revealed', correctChoice: 1, results: [{ name: 'Alice', answer: 1, score: 1 }, { name: 'Bob', answer: 2, score: 0 }] });
    }
    const revealed = view('host');
    expect(await action('host', { type: 'reveal', questionId })).toMatchObject({ ok: false });
    expect(view('host')).toEqual(revealed);
  });
  it('projects only the own choice before revelation, without solution, other choices or scores', async () => {
    await start();
    const questionId = view('Alice').questionId;
    await action('Alice', { type: 'answer', questionId, choice: 1 });
    for (const actor of ['host', 'Alice', 'Bob']) {
      const projected = view(actor);
      expect(Object.keys(projected).sort()).toEqual(['choices', 'ownAnswer', 'participants', 'phase', 'prompt', 'questionId']);
      expect(projected.ownAnswer).toBe(actor === 'Alice' ? 1 : null);
      for (const player of projected.participants) expect(Object.keys(player).sort()).toEqual(['answered', 'id', 'name']);
      expect(quizViewSchema.safeParse({ ...projected, correctChoice: 1 }).success).toBe(false);
      expect(projected).not.toHaveProperty('correctChoice');
      expect(projected).not.toHaveProperty('results');
    }
  });
  it('rejects duplicate submissions, impersonation, wrong actors, invalid choices and obsolete questions', async () => {
    await start();
    const questionId = view('host').questionId;
    expect(await action('host', { type: 'answer', questionId, choice: 1 })).toMatchObject({ ok: false });
    expect(await action('Alice', { type: 'reveal', questionId })).toMatchObject({ ok: false });
    expect(await action('Alice', { type: 'answer', questionId, choice: 1, playerId: views.get('Bob')!.viewer.sessionId })).toMatchObject({ ok: false });
    for (const choice of [-1, 4, 1.5]) expect(await action('Alice', { type: 'answer', questionId, choice })).toMatchObject({ ok: false });
    expect(await action('Alice', { type: 'answer', questionId: 'another-question', choice: 1 })).toMatchObject({ ok: false });
    const before = views.get('Alice')!, requestId = randomUUID();
    const intent = { type: 'answer', questionId, choice: 2 };
    const response = await action('Alice', intent, before, requestId);
    expect(await action('Alice', intent, before, requestId)).toEqual(response);
    expect(await action('Alice', { type: 'answer', questionId, choice: 1 })).toMatchObject({ ok: false });
    expect(view('Alice').ownAnswer).toBe(2);
  });
  it('rejects future revisions, another game id and answers after reveal; missing answers score zero', async () => {
    await start();
    const snapshot = views.get('host')!, questionId = view('host').questionId;
    const intent = { type: 'answer', questionId, choice: 1 };
    expect(await action('Alice', intent, { ...snapshot, revision: snapshot.revision + 1 })).toMatchObject({ ok: false, error: { code: 'STALE_STATE' } });
    expect(await action('Alice', intent, { ...snapshot, game: { ...snapshot.game!, id: randomUUID() } })).toMatchObject({ ok: false, error: { code: 'STALE_STATE' } });
    await action('host', { type: 'reveal', questionId });
    expect(await action('Alice', intent, snapshot)).toMatchObject({ ok: false });
    const projected = view('host');
    expect(projected.phase).toBe('revealed');
    if (projected.phase === 'revealed') expect(projected.results.every(player => player.answer === null && player.score === 0)).toBe(true);
  });
  it('freezes participants at launch and isolates quiz activity between rooms', async () => {
    await start();
    const code = views.get('host')!.code;
    await command('other-host', 'room:create');
    expect(await command('late', 'room:join', { code, name: 'Late' })).toMatchObject({ ok: false });
    await command('Alice', 'room:leave');
    await action('host', { type: 'reveal', questionId: view('host').questionId });
    expect(view('host').participants).toHaveLength(2);
    expect(views.get('other-host')!.game).toBeNull();
    expect(quizActionSchema.safeParse({ type: 'answer', questionId: 'x', choice: 0, score: 999 }).success).toBe(false);
  });
});
