import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { createRealtimeClient } from '@/lib/realtime/client';
import { createRequestId } from '@/lib/realtime/request-id';

type Client = ReturnType<typeof createRealtimeClient>;
interface Props {
  role: 'host' | 'player';
  ready: boolean;
  getClient: () => Client | null;
  onExited: () => void;
}

export function RoomExit({ role, ready, getClient, onExited }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const pending = useRef(false);
  const host = role === 'host';
  async function exit() {
    const client = getClient();
    if (!client || !ready || pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(false);
    try {
      const response = await client.send(host ? 'room:close' : 'room:leave', { requestId: createRequestId() });
      if (!response.ok) throw new Error('Départ non confirmé.');
      onExited();
    } catch {
      setError(true);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return <div className="room-exit">
    {error && <div role="alert"><p>L’action n’a pas pu être confirmée. Reconnectez-vous pour vérifier votre session.</p><Button variant="secondary" onClick={() => { const client = getClient(); client?.disconnect(); client?.connect(); }}>Vérifier la session</Button></div>}
    {host && confirming ? <div role="group" aria-label="Confirmation de fermeture">
      <p>Fermer la room déconnectera tous les participants.</p>
      <Button variant="secondary" disabled={busy} onClick={() => setConfirming(false)}>Annuler</Button>{' '}
      <Button disabled={!ready || busy} onClick={() => { void exit(); }} aria-busy={busy}>{busy ? 'Fermeture en cours…' : 'Confirmer la fermeture'}</Button>
    </div> : <Button variant="secondary" disabled={!ready || busy} onClick={() => { if (host) setConfirming(true); else void exit(); }} aria-busy={busy}>{host ? 'Fermer la room' : busy ? 'Départ en cours…' : 'Quitter la room'}</Button>}
  </div>;
}
