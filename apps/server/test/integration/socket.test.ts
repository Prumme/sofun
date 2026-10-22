import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { responseSchema, snapshotSchema } from '@party/contracts';
import type { CommandName } from '@party/contracts';
import { createApplication } from '../../src/bootstrap.js';
import { fixtureGame } from '../fixtures/game.js';
const sockets: Socket[] = [];
let app: Awaited<ReturnType<typeof createApplication>> | undefined;
afterEach(async () => { for (const socket of sockets.splice(0)) socket.disconnect(); await app?.close(); });
function once(socket: Socket, event: string): Promise<unknown[]> {
  return new Promise(resolve => socket.once(event, (...values: unknown[]) => resolve(values)));
}
async function connect(url: string) {
  const socket = io(url, { autoConnect: false, reconnection: false }); sockets.push(socket);
  const connected = once(socket, 'connect'); socket.connect(); await connected; return socket;
}
async function send(socket: Socket, name: CommandName, data: Record<string, unknown> = {}) {
  return responseSchema.parse(await socket.timeout(3000).emitWithAck(name, { requestId: randomUUID(), ...data }));
}
describe('Nest + Socket.IO', () => {
  it('boots the real module and validates, authenticates and privately projects a game', async () => {
    app = await createApplication([fixtureGame], false); await app.listen(0, '127.0.0.1');
    const url = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
    expect(await (await fetch(`${url}/api/health`)).json()).toEqual({ status: 'ok' });
    const host = await connect(url);
    const firstSnapshot = once(host, 'room:snapshot');
    const created = await send(host, 'room:create');
    expect(created.ok).toBe(true);
    const hostView = snapshotSchema.parse((await firstSnapshot)[0]);
    const alice = await connect(url); const bob = await connect(url);
    await send(alice, 'room:join', { code: hostView.code, name: 'Alice' });
    const bobCreated = await send(bob, 'room:join', { code: hostView.code, name: 'Bob' });
    expect(bobCreated.ok).toBe(true);
    const hostNext = once(host, 'room:snapshot'), aliceNext = once(alice, 'room:snapshot'), bobNext = once(bob, 'room:snapshot');
    expect(await send(host, 'game:start', { gameId: fixtureGame.id, config: { timed: false } })).toMatchObject({ ok: true });
    const hostGame = snapshotSchema.parse((await hostNext)[0]);
    const aliceGame = snapshotSchema.parse((await aliceNext)[0]);
    const bobGame = snapshotSchema.parse((await bobNext)[0]);
    expect(hostGame.game?.view).toEqual({ count: 0, secret: null });
    expect(aliceGame.game?.view).toEqual({ count: 0, secret: `secret-${aliceGame.viewer.sessionId}` });
    expect(JSON.stringify(aliceGame)).not.toContain(`secret-${bobGame.viewer.sessionId}`);
    expect(await send(alice, 'room:close')).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } });
    expect(await send(alice, 'game:action', { gameId: aliceGame.game!.id, revision: aliceGame.revision, action: { type: 'increment', score: 999 } })).toMatchObject({ ok: false, error: { code: 'ACTION_REJECTED' } });
    if (!created.ok || !created.credentials) throw new Error('Missing credentials');
    host.disconnect();
    const replacement = await connect(url);
    const restored = once(replacement, 'room:snapshot');
    expect(await send(replacement, 'session:resume', created.credentials)).toMatchObject({ ok: true });
    expect(snapshotSchema.parse((await restored)[0]).game?.id).toBe(hostGame.game?.id);
  });
});
