import { useEffect, useRef, useState } from 'react';
import { ArrowRight, CircleAlert, Gamepad2, LoaderCircle, Smartphone, Wifi, WifiOff } from 'lucide-react';
import { commandSchemas } from '@party/contracts';
import type { Snapshot } from '@party/contracts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { createRealtimeClient } from '@/lib/realtime/client';
import type { ConnectionStatus } from '@/lib/realtime/client';
import { createRequestId } from '@/lib/realtime/request-id';
import { PartyPanel } from '@/features/games/PartyPanel';
import { QuizPanel } from '@/features/quiz/QuizPanel';
import { readInviteCode } from '@/features/rooms/invite';
import { RoomInvite } from '@/features/rooms/RoomInvite';
import { RoomExit } from '@/features/rooms/RoomExit';
import { PlayersList } from '@/features/rooms/PlayersList';

type Client = ReturnType<typeof createRealtimeClient>;
interface JoinRequest { requestId: string; code: string; name: string }
interface FieldErrors { code?: string; name?: string }
const statusLabels: Record<ConnectionStatus, string> = {
  connecting: 'Connexion au serveur…', restoring: 'Restauration de la session…',
  ready: 'Serveur connecté', offline: 'Serveur indisponible', error: 'Connexion à vérifier',
};

export function PlayerJoinPage() {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [invitation] = useState(() => readInviteCode(window.location.search));
  const [code, setCode] = useState(invitation.code);
  const [name, setName] = useState('');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(invitation.invalid ? 'Le code du lien est invalide. Saisissez le code affiché par l’hôte.' : null);
  const [fields, setFields] = useState<FieldErrors>({});
  const client = useRef<Client | null>(null);
  const latestSnapshot = useRef<Snapshot | null>(null);
  const pending = useRef(false);
  const lastRequest = useRef<JoinRequest | null>(null);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    const connection = createRealtimeClient(() => {}, view => {
      latestSnapshot.current = view;
      if (view.phase === 'closed') {
        latestSnapshot.current = null;
        lastRequest.current = null;
        setSnapshot(null);
        setError('Cette room a été fermée.');
      } else if (!pending.current) {
        setSnapshot(view);
      }
    }, { onStatus: setStatus, onError: setError, onSessionRestored: () => setError(null), onSessionLost: () => { latestSnapshot.current = null; setSnapshot(null); lastRequest.current = null; } });
    client.current = connection;
    connection.connect();
    return () => { mounted.current = false; connection.disconnect(); client.current = null; };
  }, []);

  async function joinRoom() {
    if (pending.current || !client.current || status !== 'ready') return;
    setError(null);
    const values = { code: code.trim().toUpperCase(), name: name.trim() };
    const previous = lastRequest.current;
    const requestId = previous?.code === values.code && previous.name === values.name ? previous.requestId : createRequestId();
    const validation = commandSchemas['room:join'].safeParse({ requestId, ...values });
    if (!validation.success) {
      const errors: FieldErrors = {};
      for (const issue of validation.error.issues) {
        if (issue.path[0] === 'code') errors.code = 'Saisissez les 6 caractères du code affiché par l’hôte.';
        if (issue.path[0] === 'name') errors.name = 'Saisissez un pseudo de 1 à 32 caractères.';
      }
      setFields(errors);
      return;
    }
    setFields({});
    lastRequest.current = validation.data;
    pending.current = true;
    setJoining(true);
    try {
      const response = await client.current.send('room:join', validation.data);
      if (!mounted.current) return;
      if (response.ok) {
        const view = latestSnapshot.current;
        if (!response.credentials || !view || view.viewer.role !== 'player' || view.code !== values.code || view.roomId !== response.credentials.roomId || view.viewer.sessionId !== response.credentials.sessionId) {
          throw new Error('Confirmation d’admission incomplète.');
        }
        setSnapshot(view);
      } else {
        lastRequest.current = null;
        setError(response.error.code === 'ROOM_NOT_FOUND'
          ? 'Cette room est introuvable. Vérifiez le code affiché par l’hôte.'
          : response.error.code === 'INVALID_PHASE'
            ? response.error.message
            : 'Impossible de rejoindre cette room. Réessayez.');
      }
    } catch {
      if (mounted.current) setError('L’admission n’a pas pu être confirmée. Vérifiez la connexion, puis réessayez.');
    } finally {
      pending.current = false;
      if (mounted.current) setJoining(false);
    }
  }

  const ready = status === 'ready';
  const unavailable = status === 'offline' || status === 'error';
  const room = snapshot?.viewer.role === 'player' ? snapshot : null;
  const shareCode = readInviteCode(`?code=${encodeURIComponent(code)}`).code;
  const self = room?.players.find(player => player.id === room.viewer.sessionId);

  return <div className="host-page player-page">
    <a className="skip-link" href="#player-main">Aller au contenu</a>
    <header className="site-header"><div className="container header-inner">
      <a href="/" className="brand" aria-label="Party Games, accueil"><span className="brand-mark"><Gamepad2 size={22} aria-hidden="true" /></span>party<span className="brand-light">games</span><span className="brand-dot">.</span></a>
      <span className="player-mode"><Smartphone size={16} aria-hidden="true" /> Joueur</span>
    </div></header>
    <main id="player-main" className={`container player-main${!snapshot ? ' player-main--admission' : ''}`}>
      <div className={`host-connection ${ready ? 'success-text' : 'muted'}`} role="status">
        {ready ? <Wifi size={16} aria-hidden="true" /> : unavailable ? <WifiOff size={16} aria-hidden="true" /> : <LoaderCircle size={16} className="spin" aria-hidden="true" />}
        <span data-testid="connection-status">{statusLabels[status]}</span>
      </div>
      {error && <div className="host-alert" role="alert"><CircleAlert size={19} aria-hidden="true" /><p>{error}</p></div>}
      {unavailable && <div className="host-network-notice"><p>Vérifiez votre connexion au réseau local et le serveur de l’hôte.</p><Button variant="secondary" onClick={() => { client.current?.disconnect(); client.current?.connect(); }}>Réessayer la connexion</Button></div>}
      {room ? <section className="player-lobby" aria-label="Room joueur">
        {!room.game && <>
        <div className="eyebrow"><span className="line" /> VOUS ÊTES DANS LA ROOM</div>
        <h1 id="player-title">Bienvenue, <span>{self?.name ?? 'à vous'}.</span></h1>
        <p className="player-intro">La suite se passe aussi sur l’écran partagé.</p>
        <Card className="player-room-card"><span>Code de la room</span><output data-testid="room-code">{room.code}</output></Card>
        <PlayersList players={room.players} viewerId={room.viewer.sessionId} />
        </>}
        {room.game && (room.game.type === 'quiz' ? <QuizPanel key={room.game.id} snapshot={room} ready={ready} getClient={() => client.current} /> : <PartyPanel snapshot={room} ready={ready} getClient={() => client.current} />)}
        <RoomExit key={room.roomId} role="player" ready={ready} getClient={() => client.current} onExited={() => { latestSnapshot.current = null; setSnapshot(null); setError(null); lastRequest.current = null; setCode(''); setName(''); }} />
        {!room.game && <p className="player-wait-note">Installez-vous, la room est prête. L’hôte peut choisir et lancer un jeu.</p>}
      </section> : snapshot ? <section className="player-join">
        <h1>Cet onglet est <span>l’hôte.</span></h1>
        <p className="player-intro">Utilisez votre téléphone pour rejoindre comme joueur.</p>
        <RoomInvite code={snapshot.code} />
        <Button asChild><a href="/">Retrouver l’écran hôte</a></Button>
      </section> : <section className="player-join" aria-labelledby="join-title">
        <div className="eyebrow"><span className="line" /> À VOUS DE JOUER</div>
        <h1 id="join-title">Rejoignez <span>la soirée.</span></h1>
        <p className="player-intro">Le code est sur l’écran partagé.<br />Il ne manque plus que votre pseudo.</p>
        <div className="player-join-options">
        <Card className="player-form-card"><form noValidate onSubmit={event => { event.preventDefault(); void joinRoom(); }} aria-busy={joining}>
          <label htmlFor="room-code">Code de la room</label>
          <Input id="room-code" className="join-code-input" value={code} maxLength={6} placeholder="ABC234" autoComplete="off" autoCapitalize="characters" autoCorrect="off" spellCheck={false} disabled={joining} onChange={event => { setCode(event.target.value.toUpperCase()); setFields(previous => previous.name ? { name: previous.name } : {}); setError(null); }} aria-invalid={Boolean(fields.code)} aria-describedby={fields.code ? 'code-error' : 'code-help'} />
          {fields.code ? <p id="code-error" className="join-field-error" role="alert">{fields.code}</p> : <p id="code-help" className="join-field-help">6 caractères, lettres et chiffres.</p>}
          <label htmlFor="player-name">Votre pseudo</label>
          <Input id="player-name" value={name} maxLength={32} placeholder="Comment vous appelle-t-on ?" autoComplete="nickname" disabled={joining} onChange={event => { setName(event.target.value); setFields(previous => previous.code ? { code: previous.code } : {}); setError(null); }} aria-invalid={Boolean(fields.name)} aria-describedby={fields.name ? 'name-error' : undefined} />
          {fields.name && <p id="name-error" className="join-field-error" role="alert">{fields.name}</p>}
          <Button type="submit" className="player-submit" disabled={!ready || joining} aria-busy={joining}>{joining ? <LoaderCircle size={18} className="spin" aria-hidden="true" /> : <ArrowRight size={18} aria-hidden="true" />}{joining ? 'Admission en cours…' : 'Rejoindre la room'}</Button>
        </form></Card>
        <RoomInvite code={shareCode} />
        </div>
      </section>}
    </main>
    <footer className="container host-footer"><span>Moins d’effets. Plus de moments.</span><span>Ensemble sur le même réseau</span></footer>
  </div>;
}
