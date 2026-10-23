import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChoiceMark } from './ChoiceMark';
interface Props { choices: readonly string[]; host: boolean; revealed: boolean; ownAnswer: number | null; correctChoice?: number | null; ready: boolean; busy: boolean; onAnswer: (index: number) => void }
export function ChoiceGrid({ choices, host, revealed, ownAnswer, correctChoice, ready, busy, onAnswer }: Props) {
  if (choices.length !== 2 && choices.length !== 4) return <p role="alert">Deux ou quatre choix sont requis.</p>;
  return <div className="quiz-choices symbol-choices">{choices.map((choice, index) => host || revealed ? <Card key={index} className={`quiz-choice ${revealed && index === correctChoice ? 'quiz-correct' : ''}`}>
    <ChoiceMark index={index} /><span>{choice}{revealed && index === correctChoice && <strong className="quiz-choice-note">Bonne réponse</strong>}{!host && revealed && ownAnswer === index && <span className="quiz-choice-note">Votre réponse</span>}</span>
  </Card> : <Button key={index} variant="secondary" className={`quiz-choice quiz-symbol-button choice-background-${index}`} aria-label={`${String.fromCharCode(65 + index)} ${choice}`} disabled={!ready || busy || ownAnswer !== null} aria-pressed={ownAnswer === index} onClick={() => onAnswer(index)}><ChoiceMark index={index} /></Button>)}</div>;
}
