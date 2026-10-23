import type { CSSProperties } from 'react';
import { Monitor, Smartphone } from 'lucide-react';
interface Participant { id: string; name: string; connected: boolean }
export function ConnectedOrbit({ players }: { players: readonly Participant[] }) {
  const connected = players.filter(player => player.connected);
  return <section className="connected-orbit" aria-label={`${connected.length} téléphone${connected.length > 1 ? 's' : ''} connecté${connected.length > 1 ? 's' : ''}`}>
    <div className="connected-orbit-scene" aria-hidden="true">
      <span className="orbit-monitor"><Monitor size={48} strokeWidth={1.3} /></span>
      {connected.map((player, index) => {
        const ring = connected.length > 6 && index >= 6 ? 1 : 0;
        const count = ring ? connected.length - 6 : Math.min(connected.length, 6);
        const position = ring ? index - 6 : index;
        return <span key={player.id} data-testid="orbit-phone" className={`orbit-traveller orbit-ring-${ring}`} style={{ '--angle': `${position * 360 / count}deg`, '--delay': `${-index * 1.7}s` } as CSSProperties}>
          <span className="orbit-upright"><span className="orbit-phone" title={player.name}><Smartphone size={25} /></span></span>
        </span>;
      })}
    </div>
    <p>{connected.length === 0 ? 'En attente des téléphones…' : `${connected.length} téléphone${connected.length > 1 ? 's' : ''} autour du jeu.`}</p>
  </section>;
}
