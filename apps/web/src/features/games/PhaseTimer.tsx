import { Timer } from 'lucide-react';

export function PhaseTimer({ seconds, label }: { seconds: number; label: string }) {
  return <div className="phase-timer" data-urgent={seconds <= 5}>
    <div className="phase-timer-caption"><Timer size={24} aria-hidden="true" /><div><span className="phase-timer-label" role="status">{label}</span><small>Temps indicatif</small></div></div>
    <span className="phase-timer-value" role="timer" aria-label="Temps restant" aria-live="off">{seconds} s</span>
  </div>;
}
