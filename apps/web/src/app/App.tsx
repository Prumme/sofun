import { DesignWorkshop } from './DesignWorkshop';
import { HostRoomPage } from '@/features/host/HostRoomPage';

export function App() {
  return window.location.pathname.replace(/\/+$/, '') === '/design' ? <DesignWorkshop /> : <HostRoomPage />;
}
