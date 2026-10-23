import { Users } from 'lucide-react';
import type { Snapshot } from '@party/contracts';

interface Props {
  players: Snapshot['players'];
  viewerId?: string;
}

export function PlayersList({ players, viewerId }: Props) {
  return <section className="room-players" aria-label="Participants">
    {players.length === 0 && <span className="host-waiting-icon"><Users size={25} aria-hidden="true" /></span>}
    <h2>{players.length === 0 ? 'Aucun joueur pour le moment' : `${players.length} joueur${players.length > 1 ? 's' : ''} dans la room`}</h2>
    {players.length > 0 && <ul className="players-list" aria-label="Joueurs dans la room">
      {players.map(player => <li key={player.id}>
        <span className="player-avatar" aria-hidden="true"><Users size={18} /></span>
        <span className="player-identity"><span data-testid="player-name">{player.name}</span>{player.id === viewerId && <span className="player-self">Vous</span>}</span>
        <span className={`player-presence ${player.connected ? 'success-text' : 'muted'}`}>{player.connected ? 'En ligne' : 'Hors ligne'}</span>
      </li>)}
    </ul>}
  </section>;
}
