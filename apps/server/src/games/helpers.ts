import type { Json } from '@party/contracts';
import type { GameEffect } from '@party/game-sdk';
export function normalize(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' '); }
export function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items]; for (let index = result.length - 1; index > 0; index--) { const next = Math.floor(random() * (index + 1)); [result[index], result[next]] = [result[next]!, result[index]!]; } return result;
}
export function ranking(players: readonly { id: string; name: string }[], scores: Record<string, number>, points: Record<string, number>, details: Record<string, string> = {}) {
  const sorted = players.map(player => ({ ...player, score: scores[player.id] ?? 0, points: points[player.id] ?? 0, detail: details[player.id] ?? '' })).sort((a, b) => b.score - a.score);
  return sorted.map(player => ({ ...player, rank: sorted.findIndex(other => other.score === player.score) + 1 }));
}
export function schedule(roundId: string, phase: string, deadline: number, now: number): GameEffect<Json>[] { return [{ type: 'schedule', key: 'phase', delayMs: Math.max(0, deadline - now), timer: { roundId, phase } }]; }
export function timerMatches(timer: Json, roundId: string, phase: string) { return Boolean(timer && typeof timer === 'object' && !Array.isArray(timer) && timer.roundId === roundId && timer.phase === phase); }
