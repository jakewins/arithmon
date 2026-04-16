import type { GameVariables } from "./event/types";

/**
 * Typed player state — mirrors Tuxemon's NPCState for the player character.
 * Typed fields are set via `set_char_attribute`; freeform event scripting
 * state lives in `gameVariables` (set via `set_variable`).
 */
export interface PlayerState {
  name: string;
  gender: string | null;
  template: string;
  gameVariables: GameVariables;
}

/**
 * Top-level game state — mirrors Tuxemon's SaveData.
 * In-memory only for now (resets on browser refresh).
 */
export interface GameSession {
  player: PlayerState;
}

class GameVariablesImpl implements GameVariables {
  private store = new Map<string, string>();

  get(key: string): string | undefined {
    return this.store.get(key);
  }

  set(key: string, value: string): void {
    this.store.set(key, value);
  }

  has(key: string): boolean {
    return this.store.has(key);
  }

  remove(key: string): void {
    this.store.delete(key);
  }
}

function createSession(): GameSession {
  return {
    player: {
      name: "Player",
      gender: null,
      template: "adventurer",
      gameVariables: new GameVariablesImpl(),
    },
  };
}

export const session: GameSession = createSession();
