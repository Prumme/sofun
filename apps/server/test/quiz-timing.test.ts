import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { quizViewSchema } from '@party/contracts';
import type { CommandName, Credentials, Snapshot } from '@party/contracts';
import { Rooms } from '../src/rooms/rooms.js';
import { Engine } from '../src/engine/engine.js';
import { MemoryRoomStore } from '../src/storage/room-store.js';
import { quizDefinition, quizGame } from '../src/games/quiz/quiz.js';

let rooms: Rooms;
let hostCredentials: Credentials;
let views: Map<string, Snapshot>;
function command(actor: string, name: CommandName, data: Record<string, unknown> = {}) { return rooms.command(actor, name, { requestId: randomUUID(), ...data }); }
function view() {
  const value = quizViewSchema.parse(views.get('host')!.game!.view);
  if (value.phase === 'results') throw new Error('Expected a question');
  return value;
}
function action(actor: string, type: 'answer' | 'next' | 'reveal', choice = 1) {
  const snapshot = views.get('host')!;
  return command(actor, 'game:action', { gameId: snapshot.game!.id, revision: snapshot.revision, action: { type, questionId: view().questionId, ...(type === 'answer' ? { choice } : {}) } });
}
beforeEach(async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-23T12:00:00Z'));
  rooms = new Rooms(new MemoryRoomStore(), new Engine([quizGame]));
  views = new Map();
  rooms.setEvents({ snapshot: (id, snapshot) => views.set(id, snapshot), replace: () => {} });
  const created = await command('host', 'room:create');
  if (!created.ok || !created.credentials) throw new Error('Expected host credentials');
  hostCredentials = created.credentials;
  for (const name of ['Alice', 'Bob']) await command(name, 'room:join', { code: views.get('host')!.code, name });
  await command('host', 'game:start', { gameId: 'quiz', config: {} });
});
afterEach(() => { rooms.dispose(); vi.useRealTimers(); });

describe('authoritative quiz deadlines', () => {
  it('keeps the solution private until exactly twenty seconds, then reveals and scores missing answers zero', async () => {
    expect(view().deadline).toBe(Date.now() + 20_000);
    await action('Alice', 'answer');
    await vi.advanceTimersByTimeAsync(19_999);
    expect(view().phase).toBe('question');
    expect(view()).not.toHaveProperty('correctChoice');
    await vi.advanceTimersByTimeAsync(1);
    expect(view()).toMatchObject({ phase: 'revealed', results: [{ name: 'Alice', score: 1 }, { name: 'Bob', answer: null, score: 0 }] });
    expect(await action('Bob', 'answer')).toMatchObject({ ok: false });
  });
  it('rejects a response at the deadline even when the timer callback has not run', async () => {
    const deadline = view().deadline;
    vi.setSystemTime(deadline - 1);
    expect(await action('Alice', 'answer')).toMatchObject({ ok: true });
    vi.setSystemTime(deadline);
    expect(view().phase).toBe('question'); // setSystemTime does not execute timers.
    expect(await action('Bob', 'answer')).toMatchObject({ ok: false });
    expect(view().participants.find(player => player.name === 'Bob')!.answered).toBe(false);
    await vi.advanceTimersByTimeAsync(20_000);
    expect(view()).toMatchObject({ phase: 'revealed', results: [{ name: 'Alice', score: 1 }, { name: 'Bob', answer: null, score: 0 }] });
  });
  it('reveals on the last answer, cancels the old deadline and starts a fresh twenty seconds for the next question', async () => {
    const firstDeadline = view().deadline;
    await vi.advanceTimersByTimeAsync(19_999);
    await Promise.all([action('Alice', 'answer'), action('Bob', 'answer')]);
    expect(view().phase).toBe('revealed');
    await action('host', 'next');
    expect(view()).toMatchObject({ phase: 'question', questionNumber: 2, deadline: firstDeadline + 19_999 });
    await vi.advanceTimersByTimeAsync(1);
    expect(view().phase).toBe('question');
    await vi.advanceTimersByTimeAsync(19_999);
    expect(view()).toMatchObject({ phase: 'revealed', questionNumber: 2, results: [{ totalScore: 1 }, { totalScore: 1 }] });
    const revealed = view();
    await vi.advanceTimersByTimeAsync(20_000);
    expect(view()).toEqual(revealed);
  });
  it('continues the question deadline without the host and cancels timers on room closure', async () => {
    await rooms.disconnect('host');
    await vi.advanceTimersByTimeAsync(20_000);
    expect(quizViewSchema.parse(views.get('Alice')!.game!.view).phase).toBe('revealed');
    // Independent new room verifies that closure prevents a later publication.
    await command('other-host', 'room:create');
    for (const name of ['C', 'D']) await command(name, 'room:join', { code: views.get('other-host')!.code, name });
    await command('other-host', 'game:start', { gameId: 'quiz', config: {} });
    await command('other-host', 'room:close');
    const closed = views.get('C');
    expect(closed!.phase).toBe('closed');
    await vi.advanceTimersByTimeAsync(20_000);
    expect(views.get('C')).toEqual(closed);
  });
  it('resumes the host mid-question with the exact original deadline', async () => {
    const deadline = view().deadline;
    await vi.advanceTimersByTimeAsync(8_000);
    await rooms.disconnect('host');
    await vi.advanceTimersByTimeAsync(5_000);
    expect(await command('resumed-host', 'session:resume', hostCredentials)).toMatchObject({ ok: true });
    expect(quizViewSchema.parse(views.get('resumed-host')!.game!.view)).toMatchObject({ phase: 'question', deadline });
    await vi.advanceTimersByTimeAsync(6_999);
    expect(quizViewSchema.parse(views.get('resumed-host')!.game!.view).phase).toBe('question');
    await vi.advanceTimersByTimeAsync(1);
    expect(quizViewSchema.parse(views.get('resumed-host')!.game!.view).phase).toBe('revealed');
  });
  it('ignores an old question timer and reschedules an early callback for the remaining duration', () => {
    const context = { now: Date.now(), players: [{ id: randomUUID(), name: 'Alice' }, { id: randomUUID(), name: 'Bob' }], random: () => 0 };
    const state = quizDefinition.setup(context, {}).state;
    const old = quizDefinition.handleTimer(state, { questionId: 'obsolete' }, { ...context, now: state.deadline });
    expect(old.state.phase).toBe('question');
    expect(old.effects).toEqual([]);
    const early = quizDefinition.handleTimer(state, { questionId: 'solar-system' }, { ...context, now: state.deadline - 10 });
    expect(early.state.phase).toBe('question');
    expect(early.effects).toMatchObject([{ type: 'schedule', delayMs: 10 }]);
  });
});
