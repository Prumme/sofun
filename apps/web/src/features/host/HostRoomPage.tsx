import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, CircleAlert, Gamepad2, LoaderCircle, Monitor, PencilRuler, Radio, Users, Wifi, WifiOff } from 'lucide-react';
import type { Snapshot } from '@party/contracts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { createRealtimeClient } from '@/lib/realtime/client';
import type { ConnectionStatus } from '@/lib/realtime/client';
import { createRequestId } from '@/lib/realtime/request-id';

type Client = ReturnType<typeof createRealtimeClient>;
const statusLabels: Record<ConnectionStatus, string> = {
  connecting: 'Connexion au serveur…',
  restoring: 'Restauration de la session…',
  ready: 'Serveur connecté',
  offline: 'Serveur indisponible',
  error: 'Connexion à vérifier',
};

export function HostRoomPage() {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const client = useRef<Client | null>(null);
  const pending = useRef(false);
  const requestId = useRef<string | null>(null);
  const mounted = useRef(false);
  const latestSnapshot = useRef<Snapshot | null>(null);

  useEffect(() => {
    mounted.current = true;
    const connection = createRealtimeClient(() => {}, view => {
      latestSnapshot.current = view;
      if (view.phase === 'closed') {
        setSnapshot(null);
        setError('Cette room a été fermée.');
      } else if (!pending.current) {
        setSnapshot(view);
      }
    }, { onStatus: setStatus, onError: setError });
    client.current = connection;
    connection.connect();
    return () => {
      mounted.current = false;
      connection.disconnect();
      client.current = null;
    };
  }, []);

  async function createRoom() {
    if (pending.current || !client.current || status !== 'ready') return;
    pending.current = true;
    setCreating(true);
    setError(null);
    // Reuse the same request after an unconfirmed acknowledgement on this connection.
    requestId.current ??= createRequestId();
    try {
      const response = await client.current.send('room:create', { requestId: requestId.current });
      if (!mounted.current) return;
      if (response.ok) {
        const view = latestSnapshot.current;
        if (!response.credentials || !view || view.roomId !== response.credentials.roomId || view.viewer.sessionId !== response.credentials.sessionId) {
          throw new Error('Confirmation de room incomplète.');
        }
        setSnapshot(view);
      } else {
        requestId.current = null;
        setError(response.error.code === 'INVALID_PHASE'
          ? 'Une session est déjà active. Réessayez la connexion pour la retrouver.'
          : 'La room n’a pas pu être créée. Réessayez.');
      }
    } catch {
      if (mounted.current) setError('La création n’a pas pu être confirmée. Vérifiez la connexion, puis réessayez.');
    } finally {
      pending.current = false;
      if (mounted.current) setCreating(false);
    }
  }

  const isHost = snapshot?.viewer.role === 'host';
  const room = isHost ? snapshot : null;
  const ready = status === 'ready';
  const unavailable = status === 'offline' || status === 'error';

  return <div className="host-page">
    <a className="skip-link" href="#host-main">Aller au contenu</a>
    <header className="site-header">
      <div className="container header-inner">
        <a href="/" className="brand" aria-label="Party Games, accueil">
          <span className="brand-mark"><Gamepad2 size={22} aria-hidden="true" /></span>
          party<span className="brand-light">games</span><span className="brand-dot">.</span>
        </a>
        <span className="host-mode"><Monitor size={16} aria-hidden="true" /> Écran hôte</span>
        <a href="/design" className="host-design-link"><PencilRuler size={15} aria-hidden="true" /> Atelier UI</a>
      </div>
    </header>

    <main id="host-main" className="container host-main">
      <div className={`host-connection ${ready ? 'success-text' : 'muted'}`} role="status">
        {ready ? <Wifi size={16} aria-hidden="true" /> : unavailable ? <WifiOff size={16} aria-hidden="true" /> : <LoaderCircle className="spin" size={16} aria-hidden="true" />}
        <span data-testid="connection-status">{statusLabels[status]}</span>
      </div>

      {error && <div className="host-alert" role="alert"><CircleAlert size={19} aria-hidden="true" /><p>{error}</p></div>}
      {unavailable && <div className="host-network-notice">
        <p>Vérifiez que le serveur local est démarré et que cet appareil est connecté au bon réseau.</p>
        <Button variant="secondary" onClick={() => { client.current?.disconnect(); client.current?.connect(); }}>Réessayer la connexion</Button>
      </div>}

      {room ? <section className="host-lobby" aria-labelledby="lobby-title">
        <div className="eyebrow"><span className="line" /> VOTRE SOIRÉE COMMENCE ICI</div>
        <h1 id="lobby-title">Votre room est <span>prête.</span></h1>
        <p className="host-intro">Gardez cet écran ouvert sur l’ordinateur ou la télévision.</p>
        <Card className="host-code-card">
          <div className="host-code-label" id="room-code-label">CODE DE LA ROOM</div>
          <output className="host-room-code" aria-labelledby="room-code-label" data-testid="room-code">{room.code}</output>
          <div className="host-code-caption"><Check size={16} aria-hidden="true" /> Room créée sur le serveur local</div>
        </Card>
        <div className="host-waiting" aria-live="polite">
          <span className="host-waiting-icon"><Users size={25} aria-hidden="true" /></span>
          <h2>{room.players.length === 0 ? 'Aucun joueur pour le moment' : `${room.players.length} joueur${room.players.length > 1 ? 's' : ''} dans la room`}</h2>
          <p>L’accès des joueurs depuis leur téléphone sera disponible prochainement.</p>
        </div>
      </section> : snapshot ? <section className="host-welcome">
        <h1>Une session est déjà <span>active.</span></h1>
        <p className="host-intro">Cet onglet est associé à un joueur. La création d’une room nécessite un autre onglet sans session active.</p>
      </section> : <section className="host-welcome" aria-labelledby="welcome-title">
        <div className="eyebrow"><span className="line" /> UN ÉCRAN. TOUTE LA SOIRÉE.</div>
        <h1 id="welcome-title">Les bonnes soirées<br />commencent <span>ensemble.</span></h1>
        <p className="host-intro">Installez-vous, partagez cet écran.<br />Créez votre room pour préparer la soirée.</p>
        <Button className="host-create-button" onClick={() => { void createRoom(); }} disabled={!ready || creating} aria-busy={creating}>
          {creating ? <LoaderCircle className="spin" size={19} aria-hidden="true" /> : <ArrowRight size={19} aria-hidden="true" />}
          {creating ? 'Création en cours…' : 'Créer une room'}
        </Button>
        <p className="host-local-note"><Radio size={14} aria-hidden="true" /> Sur votre réseau local, sans compte.</p>
        <div className="host-outline"><Monitor size={22} aria-hidden="true" /><div><strong>Votre point de départ</strong><p>Une room, un code et bientôt tout le monde autour du jeu.</p></div></div>
      </section>}
    </main>
    <footer className="container host-footer"><span>Moins d’effets. Plus de moments.</span><span><Monitor size={14} aria-hidden="true" /> Pensé pour jouer ensemble</span></footer>
  </div>;
}
