import { Module } from '@nestjs/common';
import type { DynamicModule } from '@nestjs/common';
import { NetworkController } from './network/network.controller.js';
import { HealthController } from './health/health.controller.js';
import { Gateway } from './realtime/gateway.js';
import { Rooms } from './rooms/rooms.js';
import { MemoryRoomStore } from './storage/room-store.js';
import { Engine } from './engine/engine.js';
import type { RegisteredGame } from './engine/engine.js';
import { games } from './games/registry.js';

@Module({})
export class AppModule {
  static register(registry: readonly RegisteredGame[] = games): DynamicModule {
    return {
      module: AppModule,
      controllers: [HealthController, NetworkController],
      providers: [
        { provide: MemoryRoomStore, useFactory: () => new MemoryRoomStore() },
        { provide: Engine, useFactory: () => new Engine(registry) },
        { provide: Rooms, useFactory: (store: MemoryRoomStore, engine: Engine) => new Rooms(store, engine), inject: [MemoryRoomStore, Engine] },
        Gateway,
      ],
    };
  }
}
