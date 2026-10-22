import { Inject } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { commandNames } from '@party/contracts';
import type { CommandResponse } from '@party/contracts';
import { Rooms } from '../rooms/rooms.js';

@WebSocketGateway({ maxHttpBufferSize: 64 * 1024 })
export class Gateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  constructor(@Inject(Rooms) private readonly rooms: Rooms) {
    rooms.setEvents({
      snapshot: (connectionId, snapshot) => this.server.to(connectionId).emit('room:snapshot', snapshot),
      replace: connectionId => this.server.sockets.sockets.get(connectionId)?.disconnect(true),
    });
  }
  handleConnection(socket: Socket): void {
    const origin = socket.handshake.headers.origin;
    // Browsers must connect from this application's origin, not arbitrary LAN websites.
    if (origin) {
      try {
        const parsed = new URL(origin);
        if (parsed.origin !== process.env.PUBLIC_ORIGIN && (parsed.host !== socket.handshake.headers.host || !['http:', 'https:'].includes(parsed.protocol))) {
          socket.disconnect(true); return;
        }
      } catch { socket.disconnect(true); return; }
    }
    for (const name of commandNames) {
      socket.on(name, (input: unknown, ack: unknown) => {
        // Disconnect may occur while the per-room queue is processing a command.
        if (!socket.connected) return;
        void this.rooms.command(socket.id, name, input).then((response: CommandResponse) => {
          if (typeof ack === 'function') ack(response);
          if (!socket.connected) void this.rooms.disconnect(socket.id);
        }).catch(() => { socket.disconnect(true); });
      });
    }
  }
  handleDisconnect(socket: Socket): void { void this.rooms.disconnect(socket.id); }
}
