import type { Direction } from "./event/types";
import { session } from "./session";
import { Monster, PARTY_LIMIT } from "./model/Monster";
import { xpForLevel } from "./combat/formula";
import { getInventoryItems, addItem } from "./item/inventory";
import { markSeen, markCaught } from "./model/monsterRegistry";

/**
 * Scenes implement this to contribute their state to `A.getState()`.
 */
export interface DebugStateProvider {
  getDebugState(): Record<string, unknown>;
}

/**
 * Scenes implement the methods they support so the bridge can route debug
 * commands (interact, face, selectChoice, etc.) to the active scene.
 */
export interface DebugCommandHandler {
  debugSetInteract?(): void;
  debugFace?(direction: Direction): void;
  debugSelectChoice?(index: number): void;
  debugTypeAnswer?(text: string): void;
  debugSubmitAnswer?(): void;
  debugIsBlocking?(): boolean;
  debugWalkTo?(tileX: number, tileY: number, facing?: Direction): Promise<void>;
  debugWalkStep?(dir: Direction): Promise<{ tileX: number; tileY: number }>;
  debugStartCombat?(): void;
  debugSetEnemyHp?(hp: number): void;
  debugSpawnBattle?(
    playerSlug: string,
    enemySlug: string,
    playerLevel?: number,
    enemyLevel?: number,
    environment?: string,
  ): void;
}

export interface DebugEvent {
  type: string;
  time: number;
  data: Record<string, unknown>;
}

export type DebugEventCallback = (event: DebugEvent) => void;

const MAX_EVENTS = 2000;
const DEFAULT_TIMEOUT = 10_000;

/** Use requestAnimationFrame when available (browser), fall back to setTimeout (Node/tests). */
const nextFrame =
  typeof requestAnimationFrame === "function"
    ? requestAnimationFrame
    : (cb: () => void) => setTimeout(cb, 16);

function isDebugStateProvider(scene: unknown): scene is DebugStateProvider {
  return (
    typeof scene === "object" &&
    scene !== null &&
    "getDebugState" in scene &&
    typeof (scene as DebugStateProvider).getDebugState === "function"
  );
}

function isDebugCommandHandler(scene: unknown): scene is DebugCommandHandler {
  return typeof scene === "object" && scene !== null;
}

/**
 * Options for `setupGame()` — skips the intro sequence and puts the game in a
 * ready-to-play state. Future agents: feel free to add generally useful setup
 * fields here (e.g. money, variables, skillStates) as needs arise.
 */
export interface SetupGameOptions {
  /** Map to teleport to (default: "cotton_town"). */
  map?: string;
  /** Spawn tile X (default: 20). */
  tileX?: number;
  /** Spawn tile Y (default: 19). */
  tileY?: number;
  /** Campaign choice (default: "spyder_campaign"). */
  scenario?: string;
  /** Gender choice (default: "gender_male"). */
  gender?: string;
  /** Race/appearance choice (default: "white_male"). */
  race?: string;
  /** Monsters to add to party (default: [{ slug: "budaye", level: 5 }]). */
  monsters?: { slug: string; level: number }[];
  /** Items to add to inventory (e.g. [{ slug: "potion", count: 5 }]). */
  items?: { slug: string; count: number }[];
}

/** Race → { template, gender } mapping matching start_tuxemon.yaml */
const RACE_DEFAULTS: Record<string, { template: string; gender: string }> = {
  black_female: { template: "brownheroine_brown", gender: "female" },
  white_female: { template: "heroine", gender: "female" },
  black_male: { template: "adventurerblack", gender: "male" },
  white_male: { template: "adventurer", gender: "male" },
  gender_enby: { template: "enbyasian", gender: "nonbinary" },
  gender_whatever: { template: "penguin", gender: "nonbinary" },
};

export class DebugBridge {
  private activeScene: Phaser.Scene | null = null;
  private eventBuffer: DebugEvent[] = [];
  private listeners: DebugEventCallback[] = [];

  /** True once a scene has registered itself. */
  get ready(): boolean {
    return this.activeScene !== null;
  }

  /** Readonly array of recent events. */
  get events(): readonly DebugEvent[] {
    return this.eventBuffer;
  }

  /** Called by each scene in its `create()` method. */
  setScene(scene: Phaser.Scene): void {
    this.activeScene = scene;
  }

  /** Emit a debug event into the rolling buffer and notify listeners. */
  emit(type: string, data: Record<string, unknown>): void {
    const event: DebugEvent = { type, time: performance.now(), data };
    this.eventBuffer.push(event);
    if (this.eventBuffer.length > MAX_EVENTS) {
      this.eventBuffer.splice(0, this.eventBuffer.length - MAX_EVENTS);
    }
    for (const cb of this.listeners) {
      cb(event);
    }
  }

  /** Register a callback fired for each event as it occurs. */
  onEvent(cb: DebugEventCallback): void {
    this.listeners.push(cb);
  }

  /** Clear the event buffer. */
  clearEvents(): void {
    this.eventBuffer.length = 0;
  }

  /** Returns a JSON-serializable snapshot of the current game state. */
  getState(): Record<string, unknown> {
    const sceneState = isDebugStateProvider(this.activeScene)
      ? this.activeScene.getDebugState()
      : {};

    const p = session.player;
    return {
      scene: this.activeScene?.scene.key ?? null,
      session: {
        name: p.name,
        gender: p.gender,
        template: p.template,
        variables: p.gameVariables.toRecord(),
        money: p.money,
        bills: { ...session.bills },
        darkPower: session.skillEncounter,
        monsters: p.monsters.map((m) => ({
          id: m.id,
          slug: m.slug,
          level: m.level,
          currentHp: m.currentHp,
          maxHp: m.maxHp,
          totalXp: m.totalXp,
          xpProgress: m.xpProgress,
        })),
        inventory: getInventoryItems(p.inventory).map((e) => ({
          slug: e.item.slug,
          name: e.item.name,
          count: e.count,
        })),
        monsterStorage: session.monsterStorage.map((m) => ({
          id: m.id,
          slug: m.slug,
          level: m.level,
          currentHp: m.currentHp,
          maxHp: m.maxHp,
        })),
        monsterRegistry: {
          seen: [...session.monsterRegistry.seen],
          caught: [...session.monsterRegistry.caught],
        },
        battleOutcomes: Object.fromEntries(session.battleOutcomes),
      },
      ...sceneState,
    };
  }

  // --- Debug commands ---

  /** Simulate pressing the interact button (spacebar/Z). Resolves immediately. */
  async interact(): Promise<void> {
    const handler = this.getCommandHandler();
    if (handler?.debugSetInteract) {
      handler.debugSetInteract();
    }
  }

  /** Turn the player to face a direction. Resolves immediately. */
  async face(direction: Direction): Promise<void> {
    const handler = this.getCommandHandler();
    if (handler?.debugFace) {
      handler.debugFace(direction);
    }
  }

  /** Select a dialog choice by 0-based index. Resolves immediately. */
  async selectChoice(index: number): Promise<void> {
    const handler = this.getCommandHandler();
    if (handler?.debugSelectChoice) {
      handler.debugSelectChoice(index);
    }
  }

  /** Set the math problem input text. Resolves immediately. */
  async typeAnswer(text: string): Promise<void> {
    const handler = this.getCommandHandler();
    if (handler?.debugTypeAnswer) {
      handler.debugTypeAnswer(text);
    }
  }

  /** Submit the current math problem answer. Resolves immediately. */
  async submitAnswer(): Promise<void> {
    const handler = this.getCommandHandler();
    if (handler?.debugSubmitAnswer) {
      handler.debugSubmitAnswer();
    }
  }

  /** Walk the player to the target tile using A* pathfinding. */
  async walkTo(tileX: number, tileY: number, facing?: Direction): Promise<void> {
    const handler = this.getCommandHandler();
    if (handler?.debugWalkTo) {
      return handler.debugWalkTo(tileX, tileY, facing);
    }
  }

  /**
   * Walk the player exactly one tile in the given direction, using the
   * normal keyboard-input code path (respects directional restrictions and
   * physics collisions).  Resolves with the player's tile after the step.
   * If the direction is blocked the player stays put.
   */
  async walkStep(dir: Direction): Promise<{ tileX: number; tileY: number }> {
    const handler = this.getCommandHandler();
    if (handler?.debugWalkStep) {
      return handler.debugWalkStep(dir);
    }
    throw new Error("walkStep not supported by current scene");
  }

  /** Trigger a wild combat encounter immediately. */
  async startCombat(): Promise<void> {
    const handler = this.getCommandHandler();
    if (handler?.debugStartCombat) {
      handler.debugStartCombat();
    }
  }

  /** Spawn a battle with specific monsters for testing. */
  async spawnBattle(
    playerSlug: string,
    enemySlug: string,
    playerLevel = 5,
    enemyLevel = 5,
    environment?: string,
  ): Promise<void> {
    const handler = this.getCommandHandler();
    if (handler?.debugSpawnBattle) {
      handler.debugSpawnBattle(playerSlug, enemySlug, playerLevel, enemyLevel, environment);
    }
  }

  /** Wait until the event engine is no longer blocking. */
  async waitForIdle(timeout = DEFAULT_TIMEOUT): Promise<void> {
    return new Promise((resolve, reject) => {
      const deadline = performance.now() + timeout;

      const check = () => {
        const handler = this.getCommandHandler();
        const blocking = handler?.debugIsBlocking?.() ?? false;
        if (!blocking) {
          resolve();
          return;
        }
        if (performance.now() > deadline) {
          reject(new Error("waitForIdle timed out"));
          return;
        }
        nextFrame(check);
      };

      nextFrame(check);
    });
  }

  /** Wait for a specific event type to appear in the log. */
  async waitForEvent(type: string, timeout = DEFAULT_TIMEOUT): Promise<DebugEvent> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`waitForEvent("${type}") timed out`));
      }, timeout);

      this.onEvent((event) => {
        if (event.type === type) {
          clearTimeout(timer);
          resolve(event);
        }
      });
    });
  }

  /** Add an item to the player's inventory. */
  addItem(slug: string, count = 1): void {
    addItem(session.player.inventory, slug, count);
  }

  /** Add a monster to the player's party. Returns false if party is full. */
  addMonster(slug: string, level: number): boolean {
    if (session.player.monsters.length >= PARTY_LIMIT) return false;
    const monster = Monster.spawn(slug, level);
    session.player.monsters.push(monster);
    return true;
  }

  /** Set a party monster's HP by index. */
  setMonsterHp(index: number, hp: number): void {
    const monster = session.player.monsters[index];
    if (!monster) throw new Error(`No monster at index ${index}`);
    monster.currentHp = Math.max(0, Math.min(hp, monster.maxHp));
  }

  /** Set the current combat enemy's HP. Only works during combat. */
  setEnemyHp(hp: number): void {
    const handler = this.getCommandHandler();
    if (handler?.debugSetEnemyHp) {
      handler.debugSetEnemyHp(hp);
    }
  }

  /** Set a party monster's total XP by index. Processes any resulting level-ups. */
  setMonsterXp(index: number, xp: number): void {
    const monster = session.player.monsters[index];
    if (!monster) throw new Error(`No monster at index ${index}`);
    // Set XP directly, then trigger level-up processing via addXp(0)
    monster.totalXp = xp;
    while (monster.totalXp >= xpForLevel(monster.level + 1)) {
      monster.addXp(0);
    }
  }

  /** Mark a monster species as seen in the journal. */
  markMonsterSeen(slug: string): void {
    markSeen(session.monsterRegistry, slug);
  }

  /** Mark a monster species as caught in the journal. */
  markMonsterCaught(slug: string): void {
    markCaught(session.monsterRegistry, slug);
  }

  /** Open the journal scene directly. */
  openJournal(): void {
    if (!this.activeScene) throw new Error("No active scene");
    const scene = this.activeScene.scene;
    scene.launch("JournalScene");
  }

  /** Teleport the player to a map at the given tile. Restarts OverworldScene. */
  async teleport(mapKey: string, tileX: number, tileY: number): Promise<void> {
    if (!this.activeScene) throw new Error("No active scene");
    const scene = this.activeScene.scene;
    // Stop any combat scene that might be running
    if (scene.isActive("CombatScene")) {
      scene.stop("CombatScene");
    }
    scene.start("OverworldScene", { mapKey, spawnTileX: tileX, spawnTileY: tileY });
    // Wait for the new scene to be ready
    return new Promise((resolve) => {
      const check = () => {
        if (this.activeScene?.scene.key === "OverworldScene") {
          resolve();
          return;
        }
        nextFrame(check);
      };
      nextFrame(check);
    });
  }

  /** Set a game variable. */
  setVariable(key: string, value: string): void {
    session.player.gameVariables.set(key, value);
  }

  /** Apply a screen overlay (set_layer action). Pass empty string to clear. */
  setLayer(rgba?: string): void {
    if (!this.activeScene) return;
    const scene = this.activeScene;
    const OVERLAY_KEY = "__layerOverlay";
    const existing = (scene as unknown as Record<string, Phaser.GameObjects.Rectangle>)[
      OVERLAY_KEY
    ];
    if (existing) {
      existing.destroy();
      delete (scene as unknown as Record<string, unknown>)[OVERLAY_KEY];
    }
    if (rgba) {
      const parts = rgba.split(":").map(Number);
      const cam = scene.cameras.main;
      const color = (parts[0] << 16) | (parts[1] << 8) | parts[2];
      const overlay = scene.add
        .rectangle(0, 0, cam.width, cam.height, color, parts[3] / 255)
        .setOrigin(0, 0)
        .setDepth(50)
        .setScrollFactor(0);
      (scene as unknown as Record<string, unknown>)[OVERLAY_KEY] = overlay;
    }
  }

  /**
   * Skip the intro sequence and put the game in a ready-to-play state.
   * Sets all character-creation variables, configures the player session,
   * adds starter monsters, and teleports to the target map.
   */
  async setupGame(opts: SetupGameOptions = {}): Promise<void> {
    const scenario = opts.scenario ?? "spyder_campaign";
    const gender = opts.gender ?? "gender_male";
    const race = opts.race ?? "white_male";
    const map = opts.map ?? "cotton_town";
    const tileX = opts.tileX ?? 20;
    const tileY = opts.tileY ?? 19;
    const monsters = opts.monsters ?? [{ slug: "budaye", level: 5 }];

    // 1. Set intro-skip variables (character creation + campaign intro)
    const vars = session.player.gameVariables;
    vars.set("scenario_choice", scenario);
    vars.set("gender_choice", gender);
    vars.set("race_choice", race);
    vars.set("question_intro", "yes");
    vars.set("spyder_intro", "yes");
    vars.set("intro_scoop", "done");
    vars.set("got_starter", "yes");
    vars.set("firstfightdue", "no");

    // 2. Set player appearance from race choice
    const raceInfo = RACE_DEFAULTS[race];
    if (raceInfo) {
      session.player.template = raceInfo.template;
      session.player.gender = raceInfo.gender;
    }

    // 3. Add starter monsters
    for (const m of monsters) {
      this.addMonster(m.slug, m.level);
    }

    // 4. Add any requested items
    if (opts.items) {
      for (const item of opts.items) {
        this.addItem(item.slug, item.count);
      }
    }

    // 5. Teleport to target map
    await this.teleport(map, tileX, tileY);
  }

  private getCommandHandler(): DebugCommandHandler | null {
    if (this.activeScene && isDebugCommandHandler(this.activeScene)) {
      return this.activeScene as DebugCommandHandler;
    }
    return null;
  }
}

/** Singleton instance — scenes call `debugBridge.setScene(this)` in create(). */
export const debugBridge = new DebugBridge();

declare global {
  interface Window {
    A?: DebugBridge;
  }
}
