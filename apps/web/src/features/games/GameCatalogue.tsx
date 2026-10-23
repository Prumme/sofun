import { useEffect, useRef, useState } from 'react';
import { catalogueSchema, packListSchema, whoConfigSchema, liarConfigSchema, imagesConfigSchema, drawingConfigSchema } from '@party/contracts';
import type { Catalogue, PackList } from '@party/contracts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { createRequestId } from '@/lib/realtime/request-id';
import type { createRealtimeClient } from '@/lib/realtime/client';
import { contentRequest } from './api';
interface Props { ready: boolean; playerCount: number; getClient: () => ReturnType<typeof createRealtimeClient> | null }
export function GameCatalogue({ ready, playerCount, getClient }: Props) {
  const [games, setGames] = useState<Catalogue>([]);
  const [packs, setPacks] = useState<PackList>([]);
  const [selected, setSelected] = useState('quiz'); const [packId, setPackId] = useState('');
  const [rounds, setRounds] = useState(5); const [tours, setTours] = useState(1); const [resultsSeconds, setResultsSeconds] = useState(10);
  const [voteSeconds, setVoteSeconds] = useState(30); const [writingSeconds, setWritingSeconds] = useState(60); const [answerSeconds, setAnswerSeconds] = useState(20); const [drawingSeconds, setDrawingSeconds] = useState(90);
  const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState(false); const pending = useRef(false);
  async function load() { const [catalogue, library] = await Promise.all([fetch('/api/games').then(r => r.json()), contentRequest('packs').then(r => r.json())]); setGames(catalogueSchema.parse(catalogue)); setPacks(packListSchema.parse(library)); }
  useEffect(() => { if (ready) void load().catch(() => setError('Catalogue indisponible. Réessayez.')); }, [ready]);
  const availablePacks = packs.filter(pack => pack.game === selected);
  const activePackId = availablePacks.some(pack => pack.id === packId) ? packId : availablePacks[0]?.id ?? '';
  const activePack = availablePacks.find(pack => pack.id === activePackId);
  const enoughContent = selected === 'quiz' || Boolean(activePack && activePack.count >= (selected === 'drawing' ? playerCount * tours + 2 : rounds));
  const game = games.find(item => item.id === selected);
  async function run(task: () => Promise<unknown>) {
    if (pending.current) return; pending.current = true; setBusy(true); setError(null);
    try { await task(); } catch (e) { setError(e instanceof Error ? e.message : 'Opération refusée.'); } finally { pending.current = false; setBusy(false); }
  }
  async function start() {
    const config = selected === 'quiz' ? {} : { packId: activePackId, resultsSeconds, ...(selected === 'drawing' ? { tours, drawingSeconds } : { rounds }), ...(selected === 'who' || selected === 'liar' ? { voteSeconds } : {}), ...(selected === 'liar' ? { writingSeconds } : {}), ...(selected === 'images' ? { answerSeconds } : {}) };
    if (selected !== 'quiz') { const schema = selected === 'who' ? whoConfigSchema : selected === 'liar' ? liarConfigSchema : selected === 'images' ? imagesConfigSchema : drawingConfigSchema; if (!schema.safeParse(config).success) throw new Error('Réglages invalides. Vérifiez les nombres de manches et les durées indiquées.'); }
    const response = await getClient()?.send('game:start', { requestId: createRequestId(), gameId: selected, config });
    if (!response?.ok) throw new Error(response?.error.message ?? 'Connexion indisponible.');
  }
  const numberField = (label: string, value: number, update: (value: number) => void, min: number, max: number) => <label>{label}<input className="input" type="number" value={value} min={min} max={max} disabled={busy} onChange={event => update(Number(event.target.value))} /></label>;
  return <Card className="game-catalogue"><h2>Choisissez votre jeu</h2>
    {error && <p role="alert">{error}</p>}
    {!games.length && <Button onClick={() => { void run(load); }}>Réessayer le catalogue</Button>}
    <div className="game-picker">{games.map(item => <Button key={item.id} variant="secondary" aria-pressed={selected === item.id} disabled={busy} onClick={() => { setSelected(item.id); setPackId(''); }}>{item.title}</Button>)}</div>
    <p>{game?.description}</p>
    {selected !== 'quiz' && <div className="game-configuration">
      <label htmlFor="game-pack">Pack</label><select id="game-pack" className="input" value={activePackId} disabled={busy} onChange={event => setPackId(event.target.value)}>{availablePacks.map(pack => <option key={pack.id} value={pack.id}>{pack.title} · {pack.count} entrées</option>)}</select>
      {selected === 'drawing' ? <>{numberField('Tours de table', tours, setTours, 1, 3)}{numberField('Durée du dessin (s)', drawingSeconds, setDrawingSeconds, 30, 180)}</> : numberField('Nombre de manches', rounds, setRounds, 1, 20)}
      {(selected === 'who' || selected === 'liar') && numberField('Durée du vote (s)', voteSeconds, setVoteSeconds, 10, 120)}
      {selected === 'liar' && numberField('Durée des inventions (s)', writingSeconds, setWritingSeconds, 15, 180)}
      {selected === 'images' && numberField('Durée des réponses (s)', answerSeconds, setAnswerSeconds, 5, 120)}
      {numberField('Durée des résultats (s)', resultsSeconds, setResultsSeconds, 5, 60)}
    </div>}
    <Button disabled={!ready || busy || playerCount < (game?.minPlayers ?? 2) || (selected !== 'quiz' && !activePackId) || !enoughContent} onClick={() => { void run(start); }} aria-busy={busy}>{busy ? 'En cours…' : selected === 'quiz' ? 'Lancer le quiz' : `Lancer ${game?.title ?? 'le jeu'}`}</Button>
    {!enoughContent && <p role="status">Ce pack ne contient pas assez d’entrées pour ces réglages. Réduisez les manches ou choisissez un autre pack.</p>}
    {playerCount < (game?.minPlayers ?? 2) && <p>Invitez au moins {game?.minPlayers ?? 2} joueurs pour commencer.</p>}
    <details><summary>Bibliothèque de contenus</summary>
      <p>Packs communs aux rooms, conservés jusqu’au redémarrage. Les imports doivent contenir manifest.json et les images éventuelles.</p>
      <label>Importer un pack ZIP<input type="file" accept=".zip,application/zip" disabled={busy || !ready} onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void run(async () => { if (file.size > 20 * 1024 * 1024) throw new Error('ZIP limité à 20 Mio.'); await contentRequest('packs', { method: 'POST', headers: { 'Content-Type': 'application/zip' }, body: file }); await load(); }); }} /></label>
      {selected !== 'quiz' && <Button variant="secondary" disabled={busy} onClick={() => { void run(async () => { const blob = await (await contentRequest(`templates/${selected}`)).blob(); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `modele-${selected}.zip`; link.click(); URL.revokeObjectURL(url); }); }}>Télécharger un modèle ZIP</Button>}
      <Button variant="secondary" disabled={busy} onClick={() => { void run(load); }}>Actualiser la bibliothèque</Button>
      <ul>{packs.map(pack => <li key={pack.id}>{pack.title} · {pack.game} · {pack.count} entrées · {pack.builtIn ? 'Intégré' : 'Importé'} {!pack.builtIn && <Button variant="ghost" disabled={busy} aria-label={`Supprimer ${pack.title}`} onClick={() => { void run(async () => { await contentRequest(`packs/${pack.id}`, { method: 'DELETE' }); await load(); }); }}>Supprimer</Button>}</li>)}</ul>
    </details>
  </Card>;
}
