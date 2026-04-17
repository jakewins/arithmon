import type { GameVariables } from "./event/types";
import type { Monster } from "./model/Monster";

/**
 * Typed player state — mirrors Tuxemon's NPCState for the player character.
 * Typed fields are set via `set_char_attribute`; freeform event scripting
 * state lives in `gameVariables` (set via `set_variable`).
 */
export interface PlayerState {
  name: string;
  gender: string | null;
  template: string;
  monsters: Monster[];
  gameVariables: GameVariables;
}

export interface FaintTeleport {
  mapKey: string;
  tileX: number;
  tileY: number;
}

export interface SkillState {
  /** Leitner box 0–4. Higher = better known. */
  box: number;
  /** Global encounter counter value when this node was last practiced. */
  lastSeen: number;
}

/**
 * Top-level game state — mirrors Tuxemon's SaveData.
 * In-memory only for now (resets on browser refresh).
 */
export interface GameSession {
  player: PlayerState;
  faintTeleport?: FaintTeleport;
  /** Per-skill Leitner state, keyed by skill id (e.g. "K.OA.A.5"). */
  skillStates: Record<string, SkillState>;
  /** Global encounter counter for skill practice. */
  skillEncounter: number;
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
      monsters: [],
      gameVariables: new GameVariablesImpl(),
    },
    skillStates: {},
    skillEncounter: 0,
  };
}

export const session: GameSession = createSession();
