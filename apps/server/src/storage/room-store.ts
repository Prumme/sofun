import type { ActiveGame } from '../engine/engine.js';
import type { Session } from '../sessions/sessions.js';
export interface Room {
  id: string; code: string; revision: number;
  sessions: Map<string, Session>;
  game: ActiveGame | null;
  emptySince: number | null;
}
export interface RoomStore {
  get(id: string): Room | undefined;
  findByCode(code: string): Room | undefined;
  put(room: Room): void;
  delete(id: string): void;
  values(): Iterable<Room>;
}
export class MemoryRoomStore implements RoomStore {
  private readonly rooms = new Map<string, Room>();
  get(id: string): Room | undefined { return this.rooms.get(id); }
  findByCode(code: string): Room | undefined { return [...this.rooms.values()].find(room => room.code === code); }
  put(room: Room): void { this.rooms.set(room.id, room); }
  delete(id: string): void { this.rooms.delete(id); }
  values(): Iterable<Room> { return this.rooms.values(); }
}
