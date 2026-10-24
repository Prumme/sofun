import { useEffect, useRef, useState } from 'react';
import { drawingViewSchema, imagesViewSchema, liarViewSchema, whoViewSchema } from '@party/contracts';
import type { DrawingView, ImagesView, Json, LiarView, Snapshot, WhoView } from '@party/contracts';
import type { createRealtimeClient } from '@/lib/realtime/client';
import { createRequestId } from '@/lib/realtime/request-id';
import { Button } from '@/components/ui/button';
import { ChoiceGrid } from './ChoiceGrid';
import { PhaseTimer } from './PhaseTimer';
import { DrawingBoard } from './DrawingBoard';
export interface PartyProps { snapshot: Snapshot; ready: boolean; getClient: () => ReturnType<typeof createRealtimeClient> | null }
type View = WhoView | LiarView | ImagesView | DrawingView;
export function PartyPanel(props: PartyProps) {
  const game = props.snapshot.game;
  const schema = game?.type === 'who' ? whoViewSchema : game?.type === 'liar' ? liarViewSchema : game?.type === 'images' ? imagesViewSchema : game?.type === 'drawing' ? drawingViewSchema : null;
  const parsed = schema?.safeParse(game?.view);
  if (!game || !parsed?.success) return <p role="alert">Vue du jeu indisponible.</p>;
  return <PartyControls key={`${game.id}:${parsed.data.roundId}:${parsed.data.phase}:${props.ready}`} {...props} view={parsed.data} />;
}
function PartyControls({ snapshot, ready, getClient, view }: PartyProps & { view: View }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null); const [text, setText] = useState(''); const [notice, setNotice] = useState(''); const [now, setNow] = useState(Date.now);
  const pending = useRef(false); const mounted = useRef(true);
  useEffect(() => { mounted.current = true; const timer = setInterval(() => setNow(Date.now()), 250); return () => { mounted.current = false; clearInterval(timer); }; }, []);
  const host = snapshot.viewer.role === 'host'; const kind = snapshot.game!.type;
  async function send(action: Record<string, Json>): Promise<boolean> {
    if (pending.current || !ready) return false; const client = getClient(); if (!client) return false;
    pending.current = true; setBusy(true); setError(null);
    try {
      const result = await client.send('game:action', { requestId: createRequestId(), gameId: snapshot.game!.id, revision: snapshot.revision, action: { ...action, roundId: view.roundId } });
      if (!result.ok && mounted.current) setError(result.error.message);
      return result.ok;
    } catch { if (mounted.current) setError('Action non confirmée. Vérifiez la connexion et l’état affiché.'); return false; }
    finally { pending.current = false; if (mounted.current) setBusy(false); }
  }
  const title = kind === 'who' ? 'Qui de nous ?' : kind === 'liar' ? 'Le menteur' : kind === 'images' ? 'D’où provient cette image ?' : 'À vos crayons';
  const revealed = view.phase === 'revealed'; const final = view.phase === 'results';
  const name = (id: string) => view.participants.find(p => p.id === id)?.name ?? 'Joueur';
  const scores = <ol className="quiz-ranking" aria-label={final ? 'Classement final' : 'Scores de la manche'}>{view.results.map(result => <li key={result.id}><span className="quiz-rank">{result.rank}</span><span>{result.name}<small>{result.detail}</small></span><span className="party-score-values"><strong>{result.score} points</strong><span className="party-score-gain" aria-label={`Gain de la manche : ${result.points} points`}>+{result.points}</span></span></li>)}</ol>;
  if (final) return <section className="party-panel"><h1>Classement final</h1>{scores}{error && <p role="alert">{error}</p>}{host ? <Button disabled={!ready || busy} onClick={() => { void send({ type: 'return-lobby' }); }}>Retour au lobby</Button> : <p>L’hôte peut revenir au lobby.</p>}</section>;
  return <section className={`party-panel party-${kind} ${host ? 'party-host' : 'party-player'}`} aria-label={title}>
    <div className="eyebrow">{title} · MANCHE {view.roundNumber} / {view.totalRounds}</div>
    <PhaseTimer seconds={Math.max(0, Math.ceil((view.deadline - now) / 1000))} label={revealed ? view.roundNumber === view.totalRounds ? 'Classement final dans' : 'Prochaine manche dans' : view.phase === 'writing' ? 'Fin des inventions dans' : view.phase === 'voting' ? 'Fin du vote dans' : view.phase === 'choosing' ? 'Choisissez votre mot' : view.phase === 'drawing' ? 'Fin du dessin dans' : 'Fin des réponses dans'} />
    {'prompt' in view && <h1>{view.prompt}</h1>}
    {error && <p role="alert">{error}</p>}
    {!revealed && <p role="status">{view.participants.filter(p => p.done).length} / {view.participants.length} {view.phase === 'writing' ? 'inventions reçues' : kind === 'drawing' ? 'personnes ont trouvé' : 'réponses reçues'}</p>}
    {kind === 'who' && 'ownVote' in view && !('ownSubmission' in view) && <>
      {!revealed && !host && <div className="party-options">{view.participants.map(p => <Button key={p.id} variant="secondary" disabled={!ready || busy || view.ownVote !== null} aria-pressed={view.ownVote === p.id} onClick={() => { void send({ type: 'vote', targetId: p.id }); }}>{p.name}{p.id === snapshot.viewer.sessionId ? ' (vous)' : ''}</Button>)}</div>}
      {revealed && <ul aria-label="Détail des votes">{view.votes.map(vote => <li key={vote.voterId}>{name(vote.voterId)} → {name(vote.targetId)}</li>)}</ul>}
    </>}
    {kind === 'liar' && 'ownSubmission' in view && <>
      {view.phase === 'writing' && !host && (view.ownSubmission ? <p role="status">Invention enregistrée : {view.ownSubmission}</p> : <form onSubmit={event => { event.preventDefault(); void send({ type: 'submit', text }).then(ok => { if (ok && mounted.current) setText(''); }); }}><label>Votre invention<input className="input" maxLength={160} value={text} disabled={!ready || busy} onChange={e => setText(e.target.value)} /></label><Button type="submit" disabled={!ready || busy || !text.trim()}>Envoyer l’invention</Button></form>)}
      {view.phase === 'writing' && host && <p>Inventez une réponse crédible sur vos téléphones.</p>}
      {view.phase === 'voting' && <div className="party-options">{view.choices.map(choice => host ? <p key={choice.id}>{choice.label}</p> : <Button key={choice.id} variant="secondary" aria-pressed={view.ownVote === choice.id} disabled={!ready || busy || view.ownVote !== null || choice.disabled} onClick={() => { void send({ type: 'vote', choiceId: choice.id }); }}>{choice.label}{choice.disabled && ' (votre invention)'}</Button>)}</div>}
      {revealed && <><h2>La vérité : {view.truth}</h2><ul aria-label="Auteurs des mensonges">{view.authors.map(author => <li key={author.playerId}>{name(author.playerId)} : {author.submission} · {author.votes} vote(s)</li>)}</ul><ul aria-label="Détail des votes">{view.votes.map(vote => <li key={vote.voterId}>{name(vote.voterId)} → {view.choices.find(choice => choice.id === vote.choiceId)?.label}</li>)}</ul></>}
    </>}
    {kind === 'images' && 'assetId' in view && <div className="image-question-layout">
      {(host || revealed) && <img className="question-image" src={`/api/assets/${encodeURIComponent(view.assetId)}`} alt="Illustration à identifier" />}
      <ChoiceGrid choices={view.choices} host={host} revealed={revealed} ownAnswer={view.ownAnswer} correctChoice={view.correctChoice} ready={ready} busy={busy} onAnswer={choice => { void send({ type: 'answer', choice }); }} />
    </div>}
    {kind === 'drawing' && 'drawerId' in view && <>
      <h1>{revealed ? view.word ? `Le mot était : ${view.word}` : 'Aucun mot choisi' : `${name(view.drawerId)} dessine`}</h1>
      {view.phase === 'choosing' && <div className="party-options">{view.wordOptions.length ? view.wordOptions.map((word, index) => <Button key={word} disabled={!ready || busy} onClick={() => { void send({ type: 'choose', index }); }}>{word}</Button>) : <p>Le dessinateur choisit son mot en privé.</p>}</div>}
      {view.phase !== 'choosing' && <DrawingBoard view={view} canDraw={!host && snapshot.viewer.sessionId === view.drawerId && view.phase === 'drawing' && ready} send={send} />}
      {view.phase === 'drawing' && !host && snapshot.viewer.sessionId === view.drawerId && <><p>À dessiner : {view.word}</p><Button variant="secondary" disabled={!ready || busy} onClick={() => { void send({ type: 'clear', epoch: view.epoch }); }}>Tout effacer</Button></>}
      {view.phase === 'drawing' && !host && snapshot.viewer.sessionId !== view.drawerId && (view.ownFound ? <p role="status">Vous avez trouvé !</p> : <form onSubmit={event => { event.preventDefault(); void send({ type: 'guess', text }).then(ok => { if (ok && mounted.current) { setText(''); setNotice('Proposition envoyée. Vous pouvez réessayer si le mot n’est pas trouvé.'); } }); }}><label>Votre proposition<input className="input" maxLength={80} value={text} onChange={e => setText(e.target.value)} disabled={!ready || busy} autoComplete="off" /></label><Button type="submit" disabled={!ready || busy || !text.trim()}>Proposer</Button><p role="status">{notice}</p></form>)}
      <p>{view.participants.filter(p => p.done).map(p => p.name).join(', ')}{view.participants.some(p => p.done) ? ' : trouvé !' : ''}</p>
    </>}
    {revealed && <><h2>Résultats de la manche</h2>{scores}</>}
    {!host && !revealed && 'ownAnswer' in view && view.ownAnswer !== null && <p role="status">Réponse enregistrée.</p>}
  </section>;
}
