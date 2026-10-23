import { randomUUID } from 'node:crypto';
import type { Json } from '@party/contracts';
import type { GameDefinition, ActionContext, GameContext, GameEffect, Transition, Viewer } from '@party/game-sdk';

// Type erasure is confined to the registry; each game is checked by defineGame.
export interface RegisteredGame {
  id: string;
  actionConcurrency: 'strict-revision' | 'game-validated';
  setup(context: GameContext, config: Json): Transition<unknown, Json>;
  act(state: unknown, action: Json, context: ActionContext): Transition<unknown, Json>;
  tick(state: unknown, timer: Json, context: GameContext): Transition<unknown, Json>;
  project(state: unknown, viewer: Viewer): Json;
}
export function defineGame<S, C extends Json, A extends Json, V extends Json, T extends Json>(game: GameDefinition<S, C, A, V, T>): RegisteredGame {
  return {
    id: game.id,
    actionConcurrency: game.actionConcurrency ?? 'strict-revision',
    setup: (context, config) => game.setup(context, game.configSchema.parse(config)),
    act: (state, action, context) => {
      const result = game.handleAction(structuredClone(state) as S, game.actionSchema.parse(action), context);
      if (!result.accepted) throw new Error(result.reason);
      return result.transition;
    },
    tick: (state, timer, context) => game.handleTimer(structuredClone(state) as S, timer as T, context),
    project: (state, viewer) => game.viewSchema.parse(game.project(structuredClone(state) as S, viewer)),
  };
}
export interface ActiveGame { id: string; type: string; state: unknown }
export class Engine {
  private readonly definitions = new Map<string, RegisteredGame>();
  constructor(games: readonly RegisteredGame[] = []) {
    for (const game of games) {
      if (this.definitions.has(game.id)) throw new Error(`Duplicate game: ${game.id}`);
      this.definitions.set(game.id, game);
    }
  }
  definition(type: string): RegisteredGame {
    const game = this.definitions.get(type);
    if (!game) throw new Error('Jeu inconnu.');
    return game;
  }
  start(type: string, config: Json, context: GameContext): { game: ActiveGame; transition: Transition<unknown, Json> } {
    const transition = this.definition(type).setup(context, config);
    this.validateEffects(transition.effects);
    return { game: { id: randomUUID(), type, state: transition.state }, transition };
  }
  validateEffects(effects: readonly GameEffect<Json>[]): void {
    for (const effect of effects) {
      if (!effect.key || (effect.type === 'schedule' && (!Number.isInteger(effect.delayMs) || effect.delayMs < 0 || effect.delayMs > 2_147_483_647))) {
        throw new Error('Minuterie invalide.');
      }
    }
  }
}
