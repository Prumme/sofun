import { useRef, useState } from 'react';
import { quizViewSchema } from '@party/contracts';
import type { QuizAction, Snapshot } from '@party/contracts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { createRequestId } from '@/lib/realtime/request-id';
import type { createRealtimeClient } from '@/lib/realtime/client';

type Client = ReturnType<typeof createRealtimeClient>;
interface Props { snapshot: Snapshot; ready: boolean; getClient: () => Client | null }
export function QuizPanel({ snapshot, ready, getClient }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);
  const host = snapshot.viewer.role === 'host';
  const parsed = snapshot.game?.type === 'quiz' ? quizViewSchema.safeParse(snapshot.game.view) : null;
  async function send(action?: QuizAction) {
    const client = getClient();
    if (!client || !ready || pending.current) return;
    pending.current = true; setBusy(true); setError(null);
    try {
      const response = action && snapshot.game
        ? await client.send('game:action', { requestId: createRequestId(), gameId: snapshot.game.id, revision: snapshot.revision, action })
        : await client.send('game:start', { requestId: createRequestId(), gameId: 'quiz', config: {} });
      if (!response.ok) setError('Action refusée. Vérifiez l’état de la question avant de réessayer.');
    } catch {
      setError('L’action n’a pas pu être confirmée. Vérifiez la connexion et la réponse affichée avant de réessayer.');
    } finally { pending.current = false; setBusy(false); }
  }
  if (!snapshot.game) return host ? <Card className="quiz-start">
    <h2>Un premier quiz</h2><p>Deux joueurs minimum. Cinq questions, quatre choix, une réponse définitive par question. Un point par bonne réponse ; l’hôte révèle quand il le souhaite.</p>
    {error && <p role="alert">{error}</p>}
    <Button disabled={!ready || busy || snapshot.players.length < 2} onClick={() => { void send(); }} aria-busy={busy}>{busy ? 'Lancement en cours…' : 'Lancer le quiz'}</Button>
    {snapshot.players.length < 2 && <p>Invitez au moins deux joueurs pour commencer.</p>}
  </Card> : null;
  if (!parsed?.success) return <p role="alert">La vue du jeu est invalide ou indisponible. Réessayez la connexion.</p>;
  const view = parsed.data;
  if (view.phase === 'results') return <section className={`quiz-panel ${host ? 'quiz-host' : 'quiz-player'}`} aria-labelledby="quiz-final-title">
    <div className="eyebrow">QUIZ · PARTIE TERMINÉE</div><h1 id="quiz-final-title">Classement final</h1>
    {error && <p role="alert">{error}</p>}
    <ol className="quiz-ranking" aria-label="Classement final">
      {view.ranking.map(result => <li key={result.id} value={result.rank}><span className="quiz-rank">{result.rank}</span><span>{result.name}{result.id === snapshot.viewer.sessionId && ' (vous)'}{view.ranking.filter(other => other.score === result.score).length > 1 && <small>Ex æquo</small>}</span><strong>{result.score} / {view.totalQuestions}</strong></li>)}
    </ol>
    {host ? <Button disabled={!ready || busy} aria-busy={busy} onClick={() => { void send({ type: 'return-lobby', questionId: view.questionId }); }}>Retour au lobby</Button> : <p className="quiz-note">L’hôte peut revenir au lobby pour une nouvelle partie.</p>}
  </section>;
  const revealed = view.phase === 'revealed';
  const answered = view.participants.filter(player => player.answered).length;
  return <section className={`quiz-panel ${host ? 'quiz-host' : 'quiz-player'}`} aria-labelledby="quiz-question">
    <div className="eyebrow">QUIZ · {revealed ? 'RÉVÉLATION' : 'QUESTION'} {view.questionNumber} / {view.totalQuestions}</div>
    <h1 id="quiz-question">{view.prompt}</h1>
    <p className="quiz-progress" role="status">{answered} / {view.participants.length} réponses reçues</p>
    {error && <p role="alert">{error}</p>}
    <div className="quiz-choices">
      {view.choices.map((choice, index) => host || revealed ? <Card key={index} className={`quiz-choice ${revealed && index === view.correctChoice ? 'quiz-correct' : ''}`}>
        <span className="quiz-letter">{String.fromCharCode(65 + index)}</span><span>{choice}{revealed && index === view.correctChoice && <strong className="quiz-choice-note">Bonne réponse</strong>}{!host && view.ownAnswer === index && <span className="quiz-choice-note">Votre réponse</span>}</span>
      </Card> : <Button key={index} variant="secondary" className="quiz-choice" disabled={!ready || busy || view.ownAnswer !== null} aria-pressed={view.ownAnswer === index} onClick={() => { void send({ type: 'answer', questionId: view.questionId, choice: index }); }}>
        <span className="quiz-letter">{String.fromCharCode(65 + index)}</span><span>{choice}</span>
      </Button>)}
    </div>
    {!revealed && !host && <p className="quiz-note" role="status">{view.ownAnswer !== null ? 'Réponse enregistrée. Attendez la révélation de l’hôte.' : 'Choisissez votre réponse. Elle sera définitive.'}</p>}
    {!revealed && host && <div className="quiz-controls"><p>Révélez quand vous êtes prêt, même si des réponses manquent.</p><Button disabled={!ready || busy} onClick={() => { void send({ type: 'reveal', questionId: view.questionId }); }} aria-busy={busy}>Révéler la réponse</Button></div>}
    {revealed && <div className="quiz-results"><h2>Résultats de la question</h2><ul aria-label="Résultats de la question">
      {view.results.map(result => <li key={result.id}><span>{result.name}</span><span>{result.answer === null ? 'Sans réponse' : view.choices[result.answer]}</span><strong>{result.score} point</strong><span className="quiz-total">Total : {result.totalScore}</span></li>)}
    </ul><p>Question terminée.</p>{host ? <Button disabled={!ready || busy} aria-busy={busy} onClick={() => { void send({ type: 'next', questionId: view.questionId }); }}>{view.questionNumber === view.totalQuestions ? 'Voir le classement final' : 'Question suivante'}</Button> : <p>L’hôte prépare la suite.</p>}</div>}
  </section>;
}
