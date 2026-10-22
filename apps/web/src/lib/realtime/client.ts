import { createRequestId } from './request-id';
import { io } from 'socket.io-client';
import { commandSchemas, responseSchema, snapshotSchema } from '@party/contracts';
import type { Command, CommandName, Snapshot } from '@party/contracts';
import { clearCredentials, readCredentials, saveCredentials } from '../session/storage';

export type ConnectionStatus = 'connecting' | 'restoring' | 'ready' | 'offline' | 'error';
interface ClientOptions {
  resumeSession?: boolean;
  onStatus?: (status: ConnectionStatus) => void;
  onError?: (message: string) => void;
}
export function createRealtimeClient(
  onConnection: (connected: boolean) => void,
  onSnapshot: (snapshot: Snapshot) => void = () => {},
  options: ClientOptions = {},
) {
  const socket = io({ autoConnect: false, reconnection: true });
  let generation = 0;
  function status(value: ConnectionStatus) {
    onConnection(value === 'ready');
    options.onStatus?.(value);
  }
  async function send<N extends CommandName>(name: N, data: Command<N>) {
    if (!socket.connected) throw new Error('Connexion indisponible.');
    const connectionGeneration = generation;
    const input = commandSchemas[name].parse(data);
    const response = responseSchema.parse(await socket.timeout(5000).emitWithAck(name, input));
    if (generation !== connectionGeneration || !socket.connected) throw new Error('Connexion interrompue.');
    if (response.requestId !== input.requestId) throw new Error('Réponse inattendue.');
    if (response.ok && response.credentials) saveCredentials(response.credentials);
    if (response.ok && (name === 'room:leave' || name === 'room:close')) clearCredentials();
    return response;
  }
  socket.on('connect', () => {
    const currentGeneration = ++generation;
    const credentials = options.resumeSession === false ? null : readCredentials();
    if (!credentials) { status('ready'); return; }
    status('restoring');
    // No pending business intent is replayed on reconnect.
    void send('session:resume', { requestId: createRequestId(), ...credentials }).then(response => {
      if (!socket.connected || currentGeneration !== generation) return;
      if (!response.ok) {
        if (['INVALID_SESSION', 'ROOM_NOT_FOUND'].includes(response.error.code)) {
          clearCredentials();
          options.onError?.('Cette session n’est plus disponible. Vous pouvez créer une nouvelle room.');
          status('ready');
        } else {
          options.onError?.('Impossible de restaurer la session. Réessayez la connexion.');
          status('error');
        }
        return;
      }
      status('ready');
    }).catch(() => {
      if (!socket.connected || currentGeneration !== generation) return;
      options.onError?.('La restauration n’a pas pu être confirmée. Réessayez la connexion.');
      status('error');
    });
  });
  socket.on('disconnect', () => { generation++; status('offline'); });
  socket.on('connect_error', () => status('offline'));
  socket.on('room:snapshot', (input: unknown) => {
    const result = snapshotSchema.safeParse(input);
    if (!result.success) {
      options.onError?.('Le serveur a envoyé une réponse invalide. Réessayez la connexion.');
      socket.disconnect();
      status('error');
      return;
    }
    if (result.data.phase === 'closed') clearCredentials();
    onSnapshot(result.data);
  });
  return {
    connect: () => { status('connecting'); socket.connect(); },
    disconnect: () => socket.disconnect(),
    send,
  };
}
