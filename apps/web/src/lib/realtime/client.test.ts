import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const transport = vi.hoisted(() => {
  const handlers = new Map<string, (...args: unknown[]) => void>();
  return {
    handlers,
    socket: { connected: false, on: vi.fn(), connect: vi.fn(), disconnect: vi.fn(), timeout: vi.fn(), emitWithAck: vi.fn() },
  };
});
vi.mock('socket.io-client', () => ({ io: () => transport.socket }));
import { createRealtimeClient } from './client';

function emit(event: string, ...values: unknown[]) { transport.handlers.get(event)?.(...values); }
function connect() { transport.socket.connected = true; emit('connect'); }
let storage: Map<string, string>;
beforeEach(() => {
  vi.resetAllMocks();
  transport.handlers.clear();
  transport.socket.connected = false;
  transport.socket.on.mockImplementation((event: string, callback: (...args: unknown[]) => void) => { transport.handlers.set(event, callback); });
  transport.socket.timeout.mockReturnValue(transport.socket);
  transport.socket.disconnect.mockImplementation(() => { transport.socket.connected = false; emit('disconnect'); });
  storage = new Map();
  vi.stubGlobal('sessionStorage', { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) });
});
afterEach(() => vi.unstubAllGlobals());

describe('realtime client', () => {
  it('waits for session restoration before announcing readiness', async () => {
    const credentials = { roomId: randomUUID(), sessionId: randomUUID(), token: 'a'.repeat(64) };
    storage.set('party-games.session', JSON.stringify(credentials));
    let resolve!: (response: unknown) => void;
    transport.socket.emitWithAck.mockImplementation(() => new Promise(done => { resolve = done; }));
    const onConnection = vi.fn(), onStatus = vi.fn();
    createRealtimeClient(onConnection, undefined, { onStatus });
    connect();
    expect(onStatus).toHaveBeenLastCalledWith('restoring');
    expect(onConnection).toHaveBeenLastCalledWith(false);
    const request = transport.socket.emitWithAck.mock.calls[0]![1] as { requestId: string };
    resolve({ ok: true, requestId: request.requestId });
    await vi.waitFor(() => expect(onStatus).toHaveBeenLastCalledWith('ready'));
    expect(onConnection).toHaveBeenLastCalledWith(true);
  });
  it('does not restore host credentials when opening the design workshop', () => {
    storage.set('party-games.session', JSON.stringify({ roomId: randomUUID(), sessionId: randomUUID(), token: 'a'.repeat(64) }));
    const onConnection = vi.fn();
    createRealtimeClient(onConnection, undefined, { resumeSession: false });
    connect();
    expect(transport.socket.emitWithAck).not.toHaveBeenCalled();
    expect(onConnection).toHaveBeenLastCalledWith(true);
  });
  it('rejects malformed snapshots instead of presenting them as a room', () => {
    const onSnapshot = vi.fn(), onStatus = vi.fn();
    createRealtimeClient(() => {}, onSnapshot, { onStatus });
    connect(); emit('room:snapshot', { code: 'FAKE' });
    expect(onSnapshot).not.toHaveBeenCalled();
    expect(onStatus).toHaveBeenLastCalledWith('error');
    expect(transport.socket.disconnect).toHaveBeenCalled();
  });
  it('rejects a late acknowledgement after the connection has changed', async () => {
    let resolve!: (response: unknown) => void;
    transport.socket.emitWithAck.mockImplementation(() => new Promise(done => { resolve = done; }));
    const client = createRealtimeClient(() => {});
    connect();
    const requestId = randomUUID();
    const response = client.send('room:create', { requestId });
    const assertion = expect(response).rejects.toThrow('Connexion interrompue.');
    client.disconnect(); connect();
    resolve({ ok: true, requestId, credentials: { roomId: randomUUID(), sessionId: randomUUID(), token: 'a'.repeat(64) } });
    await assertion;
    expect(storage.has('party-games.session')).toBe(false);
  });
});
