import { quizActionSchema, quizConfigSchema, quizViewSchema } from '@party/contracts';
import type { QuizAction, QuizConfig, QuizView } from '@party/contracts';
import type { GameDefinition, Transition } from '@party/game-sdk';
import { defineGame } from '../../engine/engine.js';

// Questions and solutions remain server-only. R4 deliberately plays one question.
const question = {
  id: 'solar-system', prompt: 'Quelle est la plus grande planète du système solaire ?',
  choices: ['La Terre', 'Jupiter', 'Mars', 'Vénus'] as [string, string, string, string], correctChoice: 1,
};
export interface QuizState {
  phase: 'question' | 'revealed';
  participants: { id: string; name: string }[];
  answers: Record<string, number>;
}
function transition(state: QuizState): Transition<QuizState, never> { return { state, events: [], effects: [] }; }
export const quizDefinition: GameDefinition<QuizState, QuizConfig, QuizAction, QuizView, never> = {
  id: 'quiz', actionConcurrency: 'game-validated', configSchema: quizConfigSchema, actionSchema: quizActionSchema, viewSchema: quizViewSchema,
  setup(context) {
    if (context.players.length < 2) throw new Error('Deux joueurs sont nécessaires.');
    return transition({ phase: 'question', participants: context.players.map(player => ({ ...player })), answers: {} });
  },
  handleAction(state, action, context) {
    if (action.questionId !== question.id || state.phase !== 'question') return { accepted: false, reason: 'Question inactive.' };
    if (action.type === 'reveal') {
      if (context.actor.role !== 'host') return { accepted: false, reason: 'Hôte requis.' };
      return { accepted: true, transition: transition({ ...state, phase: 'revealed' }) };
    }
    if (context.actor.role !== 'player' || !state.participants.some(player => player.id === context.actor.sessionId)) return { accepted: false, reason: 'Participant requis.' };
    if (Object.hasOwn(state.answers, context.actor.sessionId)) return { accepted: false, reason: 'Réponse déjà enregistrée.' };
    return { accepted: true, transition: transition({ ...state, answers: { ...state.answers, [context.actor.sessionId]: action.choice } }) };
  },
  handleTimer(state) { return transition({ ...state }); },
  project(state, viewer) {
    const common = {
      questionId: question.id, prompt: question.prompt, choices: [...question.choices] as [string, string, string, string],
      participants: state.participants.map(player => ({ ...player, answered: Object.hasOwn(state.answers, player.id) })),
      ownAnswer: viewer.role === 'player' ? state.answers[viewer.sessionId] ?? null : null,
    };
    if (state.phase === 'question') return { phase: 'question', ...common };
    return { phase: 'revealed', ...common, correctChoice: question.correctChoice,
      results: state.participants.map(player => ({ ...player, answer: state.answers[player.id] ?? null, score: state.answers[player.id] === question.correctChoice ? 1 : 0 })),
    };
  },
};
export const quizGame = defineGame(quizDefinition);
