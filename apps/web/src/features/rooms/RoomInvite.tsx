import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useLanAddresses } from './useLanAddresses';
import { QRCodeSVG } from 'qrcode.react';
import { buildInviteUrl } from './invite';

export function RoomInvite({ code = '' }: { code?: string }) {
  const directUrl = buildInviteUrl(window.location.origin, code);
  const needsDiscovery = !directUrl;
  const { addresses, status, retry } = useLanAddresses(needsDiscovery);
  const [selected, setSelected] = useState('');
  const address = addresses.includes(selected) ? selected : addresses.length === 1 ? addresses[0]! : '';
  const origin = new URL(window.location.origin);
  if (address) origin.hostname = address;
  const url = directUrl ?? (address ? buildInviteUrl(origin.origin, code) : null);
  const selector = addresses.length > 1 && <label>Adresse réseau de l’ordinateur<select value={address} onChange={event => setSelected(event.target.value)} className="input"><option value="">Choisissez le réseau des téléphones</option>{addresses.map(address => <option key={address} value={address}>{address}</option>)}</select></label>;
  if (!url && status === 'loading') return <p role="status">Recherche de l’adresse réseau…</p>;
  if (!url && addresses.length > 1) return <div className="host-join-instructions">{selector}<p>Choisissez l’adresse du réseau Wi-Fi partagé avec les téléphones pour afficher le QR code.</p></div>;
  if (!url) return <div className="host-join-instructions" role="note">
    <p>{status === 'error' ? 'Impossible de détecter l’adresse réseau de cet ordinateur.' : 'Aucune adresse réseau locale compatible n’a été détectée.'} Vérifiez votre connexion au Wi-Fi ou ouvrez l’application avec l’adresse réseau de cet ordinateur. La saisie manuelle du code reste disponible sur les téléphones qui ont ouvert le site.</p>
    <Button variant="secondary" onClick={retry}>Réessayer la détection</Button>
  </div>;
  const label = code ? 'QR code pour rejoindre la room' : 'QR code pour ouvrir le formulaire joueur';
  return <section className="room-invite" aria-label="Inviter les joueurs">
    <div className="room-invite-qr"><QRCodeSVG role="img" aria-label={label} value={url} size={224} level="M" marginSize={4} bgColor="var(--qr-background)" fgColor="var(--qr-foreground)" title={label} /></div>
    <div className="room-invite-details">{selector}<h2>Scannez pour rejoindre</h2><p>{code ? 'Même réseau Wi-Fi. Choisissez votre pseudo sur le téléphone.' : 'Ouvrez ce formulaire sur votre téléphone, sur le même Wi-Fi, sans saisir l’adresse de l’ordinateur.'}</p>
      <a href={url} className="room-invite-link" aria-label={code ? 'Lien pour rejoindre la room' : 'Lien vers le formulaire joueur'}>{url}</a>
      <p>{code ? 'Ou saisissez le code manuellement.' : 'Saisissez ensuite le code de la room et votre pseudo.'}</p>
    </div>
  </section>;
}
