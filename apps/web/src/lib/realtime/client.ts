import { createRequestId } from './request-id';
import { io } from 'socket.io-client';
import { commandSchemas, responseSchema, snapshotSchema } from '@party/contracts';
import type { Command, CommandName, Snapshot } from '@party/contracts';
import { clearCredentials, readCredentials, saveCredentials } from '../session/storage';
export function createRealtimeClient(onConnection: (connected: boolean) => void, onSnapshot: (snapshot: Snapshot) => void = () => {}) {
  const socket = io({ autoConnect: false, reconnection: true });
  async function send<N extends CommandName>(name: N, data: Command<N>) {
    if (!socket.connected) throw new Error('Connexion indisponible.');
    const input = commandSchemas[name].parse(data);
    const response = responseSchema.parse(await socket.timeout(5000).emitWithAck(name, input));
    if (response.requestId !== input.requestId) throw new Error('Réponse inattendue.');
    if (response.ok && response.credentials) saveCredentials(response.credentials);
    if (response.ok && (name === 'room:leave' || name === 'room:close')) clearCredentials();
    return response;
  }
  socket.on('connect', () => {
    onConnection(true);
    const credentials = readCredentials();
    if (credentials) {
      // No pending business intent is replayed on reconnect.
      void send('session:resume', { requestId: createRequestId(), ...credentials }).then(response => {
        if (!response.ok && ['INVALID_SESSION', 'ROOM_NOT_FOUND'].includes(response.error.code)) clearCredentials();
      }).catch(() => onConnection(false));
    }
  });
  socket.on('disconnect', () => onConnection(false));
  socket.on('connect_error', () => onConnection(false));
  socket.on('room:snapshot', (input: unknown) => {
    const result = snapshotSchema.safeParse(input);
    if (!result.success) { onConnection(false); socket.disconnect(); return; }
    if (result.data.phase === 'closed') clearCredentials();
    onSnapshot(result.data);
  });
  return { connect: () => socket.connect(), disconnect: () => socket.disconnect(), send };
}
