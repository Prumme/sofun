import { QRCodeSVG } from 'qrcode.react';
import { buildInviteUrl } from './invite';

export function RoomInvite({ code = '' }: { code?: string }) {
  const url = buildInviteUrl(window.location.origin, code);
  if (!url) return <div className="host-join-instructions" role="note"><p>Pour partager un lien ou un QR code, ouvrez l’application avec l’adresse réseau de cet ordinateur. Sur les téléphones du même réseau, choisissez « Rejoindre une room » et saisissez le code affiché par l’hôte.</p></div>;
  const label = code ? 'QR code pour rejoindre la room' : 'QR code pour ouvrir le formulaire joueur';
  return <section className="room-invite" aria-label="Inviter les joueurs">
    <div className="room-invite-qr"><QRCodeSVG role="img" aria-label={label} value={url} size={224} level="M" marginSize={4} bgColor="var(--qr-background)" fgColor="var(--qr-foreground)" title={label} /></div>
    <div className="room-invite-details"><h2>Scannez pour rejoindre</h2><p>{code ? 'Même réseau Wi-Fi. Choisissez votre pseudo sur le téléphone.' : 'Ouvrez ce formulaire sur votre téléphone, sur le même Wi-Fi, sans saisir l’adresse de l’ordinateur.'}</p>
      <a href={url} className="room-invite-link" aria-label={code ? 'Lien pour rejoindre la room' : 'Lien vers le formulaire joueur'}>{url}</a>
      <p>{code ? 'Ou saisissez le code manuellement.' : 'Saisissez ensuite le code de la room et votre pseudo.'}</p>
    </div>
  </section>;
}
