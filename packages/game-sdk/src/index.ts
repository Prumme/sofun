import type { Json } from '@party/contracts';
import type { z } from 'zod';

export type Viewer = { role: 'host'; sessionId: string } | { role: 'player'; sessionId: string };
export interface GameContext {
  readonly now: number;
  readonly players: readonly { id: string; name: string }[];
  readonly random: () => number;
}
export interface GameSetupContext extends GameContext { readonly content?: Json }
export interface ActionContext extends GameContext { readonly actor: Viewer }
export type GameEffect<Timer extends Json> =
  | { type: 'schedule'; key: string; delayMs: number; timer: Timer }
  | { type: 'cancel'; key: string };
export interface Transition<State, Timer extends Json> {
  state: State;
  events: readonly Json[];
  effects: readonly GameEffect<Timer>[];
  finished?: boolean;
}
export type ActionResult<State, Timer extends Json> =
  | { accepted: true; transition: Transition<State, Timer> }
  | { accepted: false; reason: string };
export interface GameDefinition<State, Config extends Json, Action extends Json, View extends Json, Timer extends Json> {
  readonly id: string;
  // Opt-in: the game must reject obsolete phases/questions and duplicate actions itself.
  readonly actionConcurrency?: 'game-validated';
  readonly configSchema: z.ZodType<Config>;
  readonly actionSchema: z.ZodType<Action>;
  readonly viewSchema: z.ZodType<View>;
  setup(context: GameSetupContext, config: Config): Transition<State, Timer>;
  handleAction(state: Readonly<State>, action: Action, context: ActionContext): ActionResult<State, Timer>;
  handleTimer(state: Readonly<State>, timer: Timer, context: GameContext): Transition<State, Timer>;
  project(state: Readonly<State>, viewer: Viewer): View;
}
