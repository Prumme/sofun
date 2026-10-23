import { DesignWorkshop } from './DesignWorkshop';
import { HostRoomPage } from '@/features/host/HostRoomPage';
import { PlayerJoinPage } from '@/features/player/PlayerJoinPage';

export function App() {
  const path = window.location.pathname.replace(/\/+$/, '');
  if (path === '/design') return <DesignWorkshop />;
  if (path === '/join') return <PlayerJoinPage />;
  return <HostRoomPage />;
}
