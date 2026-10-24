import { Module } from '@nestjs/common';
import type { DynamicModule } from '@nestjs/common';
import { ContentLibrary } from './content/library.js';
import { ContentController } from './content/content.controller.js';
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
      controllers: [HealthController, NetworkController, ContentController],
      providers: [
        { provide: ContentLibrary, useFactory: () => new ContentLibrary() },
        { provide: MemoryRoomStore, useFactory: () => new MemoryRoomStore() },
        { provide: Engine, useFactory: () => new Engine(registry) },
        { provide: Rooms, useFactory: (store: MemoryRoomStore, engine: Engine, content: ContentLibrary) => new Rooms(store, engine, Date.now, content), inject: [MemoryRoomStore, Engine, ContentLibrary] },
        Gateway,
      ],
    };
  }
}
