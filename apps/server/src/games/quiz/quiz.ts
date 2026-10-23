import { quizActionSchema, quizConfigSchema, quizViewSchema } from '@party/contracts';
import type { QuizAction, QuizConfig, QuizView } from '@party/contracts';
import type { GameDefinition, Transition } from '@party/game-sdk';
import { defineGame } from '../../engine/engine.js';
import { questions } from './questions.js';

export interface QuizState {
  phase: 'question' | 'revealed' | 'results';
  questionIndex: number;
  participants: { id: string; name: string }[];
  answers: Record<string, number>;
  scores: Record<string, number>;
}
function transition(state: QuizState): Transition<QuizState, never> { return { state, events: [], effects: [] }; }
export const quizDefinition: GameDefinition<QuizState, QuizConfig, QuizAction, QuizView, never> = {
  id: 'quiz', actionConcurrency: 'game-validated', configSchema: quizConfigSchema, actionSchema: quizActionSchema, viewSchema: quizViewSchema,
  setup(context) {
    if (context.players.length < 2) throw new Error('Deux joueurs sont nécessaires.');
    return transition({ phase: 'question', questionIndex: 0, participants: context.players.map(player => ({ ...player })), answers: {}, scores: Object.fromEntries(context.players.map(player => [player.id, 0])) });
  },
  handleAction(state, action, context) {
    const question = questions[state.questionIndex]!;
    if (action.questionId !== question.id) return { accepted: false, reason: 'Question inactive.' };
    if (action.type !== 'answer') {
      if (context.actor.role !== 'host') return { accepted: false, reason: 'Hôte requis.' };
      if (action.type === 'return-lobby' && state.phase === 'results') return { accepted: true, transition: { ...transition({ ...state }), finished: true } };
      if (action.type === 'next' && state.phase === 'revealed') return { accepted: true, transition: transition(state.questionIndex === questions.length - 1
        ? { ...state, phase: 'results' }
        : { ...state, phase: 'question', questionIndex: state.questionIndex + 1, answers: {} }) };
      if (action.type === 'reveal' && state.phase === 'question') return { accepted: true, transition: transition({ ...state, phase: 'revealed', scores: Object.fromEntries(state.participants.map(player => [player.id, state.scores[player.id]! + (state.answers[player.id] === question.correctChoice ? 1 : 0)])) }) };
      return { accepted: false, reason: 'Action indisponible dans cette phase.' };
    }
    if (state.phase !== 'question') return { accepted: false, reason: 'Question inactive.' };
    if (context.actor.role !== 'player' || !state.participants.some(player => player.id === context.actor.sessionId)) return { accepted: false, reason: 'Participant requis.' };
    if (Object.hasOwn(state.answers, context.actor.sessionId)) return { accepted: false, reason: 'Réponse déjà enregistrée.' };
    return { accepted: true, transition: transition({ ...state, answers: { ...state.answers, [context.actor.sessionId]: action.choice } }) };
  },
  handleTimer(state) { return transition({ ...state }); },
  project(state, viewer) {
    const question = questions[state.questionIndex]!;
    if (state.phase === 'results') {
      // Stable sort preserves lobby order for equal scores without breaking ties.
      const sorted = state.participants.map(player => ({ ...player, score: state.scores[player.id]! })).sort((a, b) => b.score - a.score);
      return { phase: 'results', questionId: question.id, totalQuestions: 5,
        ranking: sorted.map(player => ({ ...player, rank: sorted.findIndex(other => other.score === player.score) + 1 })),
      };
    }
    const common = {
      questionId: question.id, questionNumber: state.questionIndex + 1, totalQuestions: 5 as const, prompt: question.prompt, choices: [...question.choices] as [string, string, string, string],
      participants: state.participants.map(player => ({ ...player, answered: Object.hasOwn(state.answers, player.id) })),
      ownAnswer: viewer.role === 'player' ? state.answers[viewer.sessionId] ?? null : null,
    };
    if (state.phase === 'question') return { phase: 'question', ...common };
    return { phase: 'revealed', ...common, correctChoice: question.correctChoice,
      results: state.participants.map(player => ({ ...player, answer: state.answers[player.id] ?? null, score: state.answers[player.id] === question.correctChoice ? 1 : 0, totalScore: state.scores[player.id]! })),
    };
  },
};
export const quizGame = defineGame(quizDefinition);
