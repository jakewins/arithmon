import type { GameSession } from "../session";
import type PF from "pathfinding";
import type { DirectionalGrid } from "./pathfinding";

export type Direction = "up" | "down" | "left" | "right";

export interface ConditionDef {
  operator: "is" | "not";
  type: string;
  args: string[];
}

export interface ActionDef {
  type: string;
  args: string[];
}

export interface EventDef {
  id: number;
  name: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  conditions: ConditionDef[];
  actions: ActionDef[];
}

export interface EventContext {
  scene: Phaser.Scene;
  session: GameSession;
  player: { tileX: number; tileY: number; facing: Direction };
  /** The player's Phaser sprite — used by pathfind when slug is "player". */
  playerSprite?: Phaser.GameObjects.Sprite;
  /** Shortcut for session.player.gameVariables — avoids churn on existing actions. */
  variables: GameVariables;
  interactPressed: boolean;
  /** True on the frame the player transitions to a new tile. */
  playerMoved: boolean;
  npcs: Map<string, NpcState>;
  controls: {
    locked: boolean;
    cutsceneDone?: boolean;
    pendingTeleport?: PendingTeleport;
  };
  /** Static collision group — NPC bodies are added here for physics blocking. */
  collisionBodies?: Phaser.Physics.Arcade.StaticGroup;
  /** Walkability grid for A* pathfinding (built from collision layer). */
  walkGrid?: PF.Grid;
  /**
   * Per-tile directional restrictions (door / fence / stair tiles). When
   * provided to `findPath`, these tiles are re-opened in the working grid
   * and the resulting path is validated against enter_from / exit_from.
   */
  directionalGrid?: DirectionalGrid;
  /** Debug override: when set, the choice action selects this index and confirms. */
  debugChoiceOverride?: number;
  /** Merge additional events into the running engine (used by load_yaml). */
  addEvents?: (events: EventDef[]) => void;
}

export interface PendingTeleport {
  mapKey: string;
  tileX: number;
  tileY: number;
  duration: number;
  facing?: Direction;
}

export interface NpcState {
  slug: string;
  tileX: number;
  tileY: number;
  facing: Direction;
  sprite: Phaser.GameObjects.Sprite;
  collisionBody?: Phaser.GameObjects.Rectangle;
}

export interface GameVariables {
  get(key: string): string | undefined;
  set(key: string, value: string): void;
  has(key: string): boolean;
  remove(key: string): void;
  toRecord(): Record<string, string>;
}

export interface EventCondition {
  type: string;
  test(ctx: EventContext, def: EventDef): boolean;
}

export interface EventAction {
  type: string;
  done: boolean;
  start(ctx: EventContext): void;
  update(ctx: EventContext, dt: number): void;
  cleanup(ctx: EventContext): void;
}

export type ConditionFactory = (args: string[]) => EventCondition;
export type ActionFactory = (args: string[]) => EventAction;
