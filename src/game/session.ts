import type { GameVariables } from "./event/types";
import { type Inventory, createInventory, addItem } from "./item/inventory";
import { Monster } from "./model/Monster";
import { type MonsterRegistry, createMonsterRegistry } from "./model/monsterRegistry";

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
  inventory: Inventory;
  money: number;
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

export type CombatOutcome = "won" | "lost" | "fled";

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
  /** Overflow storage for captured monsters when party is full. */
  monsterStorage: Monster[];
  /** Tracks which monster species have been seen/caught. */
  monsterRegistry: MonsterRegistry;
  /** Tracks last battle outcome per NPC slug. Written by start_battle, read by battle_outcome condition. */
  battleOutcomes: Map<string, CombatOutcome>;
  /**
   * Per-NPC dynamic parties. Populated by `add_monster <slug>,<level>,<npc>`
   * (e.g. the First Fight assigns Billie a copy of the player's scoop pick).
   * `start_battle` reads this first, then falls back to the static party in
   * `npcParties.ts` if there's no dynamic entry. Cleared on new game.
   */
  npcParties: Map<string, Monster[]>;
  /** Cathedral billing accounts, keyed by bill name (e.g. "bill_cathedral"). */
  bills: Record<string, number>;
  /** Current map environment (can be overridden by set_environment action). */
  environment: string;
  /** Whether the current map is indoors. */
  inside: boolean;
  /** Current map type tag (e.g. "clinic", "shop"). */
  locationType: string;
  /** Current map key. */
  mapKey: string;
  /** Current time-of-day stage. */
  timeStage: "dawn" | "morning" | "day" | "dusk" | "night";
  /** Named kennels for monster storage. */
  kennels: Record<string, { monsters: Monster[]; visible: boolean }>;
  /** Slug of the currently playing music track (or null). Written by `play_music`. */
  musicPlaying: string | null;
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

  toRecord(): Record<string, string> {
    return Object.fromEntries(this.store);
  }
}

function createSession(): GameSession {
  const inventory = createInventory();
  addItem(inventory, "potion", 3);
  addItem(inventory, "tuxeball", 5);

  return {
    player: {
      name: "Player",
      gender: null,
      template: "adventurer",
      monsters: [],
      inventory,
      money: 500,
      gameVariables: new GameVariablesImpl(),
    },
    skillStates: {},
    skillEncounter: 0,
    monsterStorage: [],
    monsterRegistry: createMonsterRegistry(),
    battleOutcomes: new Map(),
    npcParties: new Map(),
    bills: {},
    environment: "grass",
    inside: false,
    locationType: "",
    mapKey: "",
    timeStage: "day",
    kennels: { Kennel: { monsters: [], visible: true } },
    musicPlaying: null,
  };
}

export const session: GameSession = createSession();

/**
 * Reset the live `session` object back to a fresh-boot state. Mutates the
 * exported singleton in place so any module-scoped references keep working.
 * Used by `clearSave()` when the player chooses "New Game" from the title
 * screen and we need to wipe stale state from a previous run.
 */
export function resetSession(): void {
  const fresh = createSession();
  Object.assign(session, fresh);
}
