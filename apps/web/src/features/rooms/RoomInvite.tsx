import { QRCodeSVG } from 'qrcode.react';
import { buildInviteUrl } from './invite';

export function RoomInvite({ code }: { code: string }) {
  const url = buildInviteUrl(window.location.origin, code);
  if (!url) return <div className="host-join-instructions" role="note"><p>Pour partager un lien ou un QR code, ouvrez l’application avec l’adresse réseau de cet ordinateur. Sur les téléphones du même réseau, choisissez « Rejoindre une room » et saisissez le code ci-dessus.</p></div>;
  return <section className="room-invite" aria-label="Inviter les joueurs">
    <div className="room-invite-qr"><QRCodeSVG role="img" aria-label="QR code pour rejoindre la room" value={url} size={224} level="M" marginSize={4} bgColor="var(--qr-background)" fgColor="var(--qr-foreground)" title="QR code pour rejoindre la room" /></div>
    <div className="room-invite-details"><h2>Scannez pour rejoindre</h2><p>Même réseau Wi-Fi. Choisissez votre pseudo sur le téléphone.</p>
      <a href={url} className="room-invite-link" aria-label="Lien pour rejoindre la room">{url}</a>
      <p>Ou saisissez le code manuellement.</p>
    </div>
  </section>;
}
