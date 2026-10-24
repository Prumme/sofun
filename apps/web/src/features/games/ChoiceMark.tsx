import { Circle, Diamond, Square, Triangle } from 'lucide-react';
const symbols = [Triangle, Diamond, Circle, Square];
export function ChoiceMark({ index }: { index: number }) {
  const Icon = symbols[index];
  return Icon ? <span className={`choice-mark choice-color-${index}`} aria-hidden="true"><Icon strokeWidth={2} fill="currentColor" /></span> : null;
}
