import { createHash, randomInt, randomUUID } from 'node:crypto';
import { commandSchemas, requestSchema, responseSchema, snapshotSchema } from '@party/contracts';
import type { CommandName, CommandResponse, ErrorCode, Json, Snapshot } from '@party/contracts';
import type { GameContext, Transition } from '@party/game-sdk';
import type { Engine } from '../engine/engine.js';
import type { Room, RoomStore } from '../storage/room-store.js';
import { createSession, verifyToken, viewerFor } from '../sessions/sessions.js';
import type { Session } from '../sessions/sessions.js';

export class RoomError extends Error {
  constructor(readonly code: ErrorCode, message: string) { super(message); }
}
const TWO_HOURS = 2 * 60 * 60 * 1000;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
interface Identity { roomId: string; sessionId: string }
interface Cached { fingerprint: string; response: CommandResponse }
export interface RoomEvents {
  snapshot(connectionId: string, snapshot: Snapshot): void;
  replace(connectionId: string): void;
}
export class Rooms {
  private readonly connections = new Map<string, Identity>();
  private readonly queues = new Map<string, Promise<unknown>>();
  private readonly cache = new Map<string, Map<string, Cached>>();
  private readonly timers = new Map<string, Map<string, ReturnType<typeof setTimeout>>>();
  private readonly departures = new Set<string>();
  private readonly cleanup: ReturnType<typeof setInterval>;
  private events: RoomEvents = { snapshot: () => {}, replace: () => {} };
  constructor(readonly store: RoomStore, readonly engine: Engine, private readonly now: () => number = Date.now) {
    this.cleanup = setInterval(() => { void this.sweep(); }, 60_000);
    this.cleanup.unref();
  }
  setEvents(events: RoomEvents): void { this.events = events; }
  private async serial<T>(key: string, run: () => T | Promise<T>): Promise<T> {
    const pending = (this.queues.get(key) ?? Promise.resolve()).catch(() => {}).then(run);
    this.queues.set(key, pending);
    try { return await pending; } finally { if (this.queues.get(key) === pending) this.queues.delete(key); }
  }
  private room(id: string): Room {
    const room = this.store.get(id);
    if (!room) throw new RoomError('ROOM_NOT_FOUND', 'Room introuvable.');
    return room;
  }
  private identity(connectionId: string): { room: Room; session: Session } {
    const identity = this.connections.get(connectionId);
    if (!identity) throw new RoomError('INVALID_SESSION', 'Session invalide.');
    const room = this.room(identity.roomId);
    const session = room.sessions.get(identity.sessionId);
    if (!session || session.connectionId !== connectionId) throw new RoomError('INVALID_SESSION', 'Session invalide.');
    return { room, session };
  }
  private context(room: Room): GameContext {
    return { now: this.now(), random: () => randomInt(0, 2 ** 32) / 2 ** 32,
      players: [...room.sessions.values()].filter(s => s.role === 'player').map(s => ({ id: s.id, name: s.name })) };
  }
  private snapshots(room: Room, closed = false): { connectionId: string; snapshot: Snapshot }[] {
    const results: { connectionId: string; snapshot: Snapshot }[] = [];
    for (const session of room.sessions.values()) {
      if (!session.connectionId) continue;
      const snapshot = snapshotSchema.parse({
        roomId: room.id, code: room.code, revision: room.revision, phase: closed ? 'closed' : room.game ? 'playing' : 'lobby',
        players: [...room.sessions.values()].filter(s => s.role === 'player').map(s => ({ id: s.id, name: s.name, connected: s.connectionId !== null })),
        viewer: viewerFor(session),
        game: !closed && room.game ? { id: room.game.id, type: room.game.type, view: this.engine.definition(room.game.type).project(room.game.state, viewerFor(session)) } : null,
      });
      results.push({ connectionId: session.connectionId, snapshot });
    }
    return results;
  }
  private emit(room: Room, closed = false): void {
    for (const { connectionId, snapshot } of this.snapshots(room, closed)) this.events.snapshot(connectionId, snapshot);
  }
  private attach(room: Room, session: Session, connectionId: string): void {
    const previous = session.connectionId;
    session.connectionId = connectionId;
    this.connections.set(connectionId, { roomId: room.id, sessionId: session.id });
    room.emptySince = null;
    if (previous && previous !== connectionId) {
      this.connections.delete(previous);
      this.events.replace(previous);
    }
  }
  async command(connectionId: string, name: CommandName, input: unknown): Promise<CommandResponse> {
    const parsed = commandSchemas[name].safeParse(input);
    // Even malformed commands receive a well-formed response, without echoing arbitrary input.
    const requestId = parsed.success ? parsed.data.requestId : requestSchema.safeParse(input).data?.requestId ?? randomUUID();
    if (!parsed.success) return { ok: false, requestId, error: { code: 'INVALID_MESSAGE', message: 'Message invalide.' } };
    const data = parsed.data;
    const fingerprint = createHash('sha256').update(JSON.stringify([name, data])).digest('hex');
    const identity = this.connections.get(connectionId);
    const target = name === 'session:resume' && 'roomId' in data && typeof data.roomId === 'string' ? data.roomId
      : name === 'room:join' && 'code' in data && typeof data.code === 'string' ? this.store.findByCode(data.code)?.id
      : identity?.roomId;
    const key = target ?? `connection:${connectionId}`;
    return this.serial(key, () => {
      // Authenticate again inside the queue; a preceding command may have replaced this socket.
      const cacheKey = name === 'room:create' || name === 'room:join' || name === 'session:resume'
        ? `connection:${connectionId}` : `session:${this.identity(connectionId).session.id}`;
      const history = this.cache.get(cacheKey) ?? new Map<string, Cached>();
      this.cache.set(cacheKey, history);
      const cached = history.get(requestId);
      if (cached) {
        if (cached.fingerprint !== fingerprint) return { ok: false, requestId, error: { code: 'REQUEST_CONFLICT', message: 'Identifiant de requête réutilisé.' } } as CommandResponse;
        return cached.response;
      }
      let response: CommandResponse;
      try {
        const credentials = this.execute(connectionId, name, data);
        response = credentials ? { ok: true, requestId, credentials } : { ok: true, requestId };
      } catch (error) {
        response = { ok: false, requestId, error: error instanceof RoomError
          ? { code: error.code, message: error.message }
          : { code: 'ACTION_REJECTED', message: 'Action refusée.' } };
      }
      response = responseSchema.parse(response);
      // Closing/departing must not recreate session caches deleted by the operation.
      if (this.cache.get(cacheKey) === history) {
        history.set(requestId, { fingerprint, response });
        if (history.size > 256) history.delete(history.keys().next().value!);
      }
      return response;
    }).catch(error => ({ ok: false, requestId, error: error instanceof RoomError
      ? { code: error.code, message: error.message } : { code: 'INTERNAL_ERROR', message: 'Erreur interne.' } }));
  }
  private execute(connectionId: string, name: CommandName, data: ReturnType<(typeof commandSchemas)[CommandName]['parse']>) {
    if (name === 'room:create') {
      if (this.connections.has(connectionId)) throw new RoomError('INVALID_PHASE', 'Quittez votre room avant de continuer.');
      let code: string;
      do { code = Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join(''); } while (this.store.findByCode(code));
      const { session, token } = createSession('host', 'Hôte', connectionId);
      const room: Room = { id: randomUUID(), code, revision: 0, sessions: new Map([[session.id, session]]), game: null, emptySince: null };
      this.store.put(room); this.attach(room, session, connectionId); this.emit(room);
      return { roomId: room.id, sessionId: session.id, token };
    }
    if (name === 'room:join' && 'code' in data && 'name' in data) {
      if (this.connections.has(connectionId)) throw new RoomError('INVALID_PHASE', 'Quittez votre room avant de continuer.');
      const room = this.store.findByCode(data.code);
      if (!room) throw new RoomError('ROOM_NOT_FOUND', 'Room introuvable.');
      if (room.game) throw new RoomError('INVALID_PHASE', 'La partie a déjà commencé.');
      const { session, token } = createSession('player', data.name, connectionId);
      room.sessions.set(session.id, session); this.attach(room, session, connectionId); room.revision++; this.emit(room);
      return { roomId: room.id, sessionId: session.id, token };
    }
    if (name === 'session:resume' && 'token' in data) {
      const room = this.room(data.roomId);
      const session = room.sessions.get(data.sessionId);
      if (!session || this.departures.has(session.id) || !verifyToken(session, data.token)) throw new RoomError('INVALID_SESSION', 'Session invalide.');
      const current = this.connections.get(connectionId);
      if (current && (current.roomId !== room.id || current.sessionId !== session.id)) throw new RoomError('INVALID_PHASE', 'Une autre session est déjà active.');
      this.attach(room, session, connectionId); room.revision++; this.emit(room);
      return undefined;
    }
    const { room, session } = this.identity(connectionId);
    if (name === 'room:close') {
      if (session.role !== 'host') throw new RoomError('FORBIDDEN', 'Action réservée à l’hôte.');
      room.revision++; this.emit(room, true); this.remove(room); return undefined;
    }
    if (name === 'room:leave') {
      if (session.role === 'host') throw new RoomError('FORBIDDEN', 'L’hôte doit fermer la room.');
      session.connectionId = null; this.connections.delete(connectionId);
      this.cache.delete(`session:${session.id}`); this.cache.delete(`connection:${connectionId}`);
      if (room.game) this.departures.add(session.id); else room.sessions.delete(session.id);
      room.revision++; this.markEmpty(room); this.emit(room); return undefined;
    }
    if (name === 'game:start' && 'config' in data) {
      if (session.role !== 'host') throw new RoomError('FORBIDDEN', 'Action réservée à l’hôte.');
      if (room.game) throw new RoomError('INVALID_PHASE', 'Une partie est déjà active.');
      const { game, transition } = this.engine.start(data.gameId, data.config, this.context(room));
      room.game = game;
      try { this.apply(room, transition); } catch (error) { room.game = null; throw error; }
      return undefined;
    }
    if (name === 'game:action' && 'action' in data) {
      if (!room.game) throw new RoomError('INVALID_PHASE', 'Aucune partie active.');
      if (room.game.id !== data.gameId || room.revision !== data.revision) {
        this.emit(room); throw new RoomError('STALE_STATE', 'État obsolète.');
      }
      const transition = this.engine.definition(room.game.type).act(room.game.state, data.action, { ...this.context(room), actor: viewerFor(session) });
      this.apply(room, transition); return undefined;
    }
    throw new RoomError('INVALID_MESSAGE', 'Message invalide.');
  }
  private apply(room: Room, transition: Transition<unknown, Json>): void {
    if (!room.game) return;
    this.engine.validateEffects(transition.effects);
    const nextRoom: Room = { ...room, revision: room.revision + 1, game: transition.finished ? null : { ...room.game, state: transition.state }, sessions: new Map(room.sessions) };
    if (transition.finished) for (const id of this.departures) nextRoom.sessions.delete(id);
    // Validate every recipient before committing; a faulty projection cannot partially publish state.
    const snapshots = this.snapshots(nextRoom);
    room.game.state = transition.state;
    room.revision++;
    if (transition.finished) {
      room.game = null; this.clearTimers(room.id);
      for (const session of room.sessions.values()) if (this.departures.delete(session.id)) room.sessions.delete(session.id);
    } else {
      const gameId = room.game.id;
      const timers = this.timers.get(room.id) ?? new Map<string, ReturnType<typeof setTimeout>>();
      this.timers.set(room.id, timers);
      for (const effect of transition.effects) {
        clearTimeout(timers.get(effect.key)); timers.delete(effect.key);
        if (effect.type === 'schedule') {
          const timer = setTimeout(() => {
            void this.serial(room.id, () => {
              if (timers.get(effect.key) !== timer) return;
              timers.delete(effect.key);
              const current = this.store.get(room.id);
              if (current?.game?.id !== gameId) return;
              const next = this.engine.definition(current.game.type).tick(current.game.state, effect.timer, this.context(current));
              this.apply(current, next);
            }).catch(() => { console.error('Échec de minuterie de jeu.'); });
          }, effect.delayMs);
          timer.unref(); timers.set(effect.key, timer);
        }
      }
    }
    for (const { connectionId, snapshot } of snapshots) this.events.snapshot(connectionId, snapshot);
  }
  async disconnect(connectionId: string): Promise<void> {
    this.cache.delete(`connection:${connectionId}`);
    const identity = this.connections.get(connectionId);
    if (!identity) return;
    await this.serial(identity.roomId, () => {
      const room = this.store.get(identity.roomId);
      const session = room?.sessions.get(identity.sessionId);
      if (!room || session?.connectionId !== connectionId) return;
      session.connectionId = null; this.connections.delete(connectionId); room.revision++;
      this.markEmpty(room); this.emit(room);
    });
  }
  private markEmpty(room: Room): void {
    if ([...room.sessions.values()].every(s => s.connectionId === null)) room.emptySince ??= this.now();
  }
  async sweep(): Promise<void> {
    await Promise.all([...this.store.values()].map(room => this.serial(room.id, () => {
      if (room.emptySince !== null && this.now() - room.emptySince >= TWO_HOURS) this.remove(room);
    })));
  }
  private clearTimers(roomId: string): void {
    for (const timer of this.timers.get(roomId)?.values() ?? []) clearTimeout(timer);
    this.timers.delete(roomId);
  }
  private remove(room: Room): void {
    this.clearTimers(room.id);
    for (const session of room.sessions.values()) {
      if (session.connectionId) { this.connections.delete(session.connectionId); this.cache.delete(`connection:${session.connectionId}`); }
      this.cache.delete(`session:${session.id}`); this.departures.delete(session.id);
    }
    this.store.delete(room.id);
  }
  onModuleDestroy(): void { this.dispose(); }
  dispose(): void {
    clearInterval(this.cleanup);
    for (const id of this.timers.keys()) this.clearTimers(id);
    this.cache.clear(); this.connections.clear(); this.departures.clear();
  }
}
