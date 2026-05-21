import type { Direction } from "./event/types";
import type { PerseusProblem } from "./data/problems";
import { session } from "./session";
import { Monster, PARTY_LIMIT } from "./model/Monster";
import { xpForLevel } from "./combat/formula";
import { debugFlags } from "./combat/techniqueExecutor";
import { encounterDebugFlags } from "./data/encounters";
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
  debugSubmitCombatAction?(action: unknown): { type: string; message: string }[];
  debugSpawnBattle?(
    playerSlug: string,
    enemySlug: string,
    playerLevel?: number,
    enemyLevel?: number,
    environment?: string,
  ): void;
  debugSpawnNpc?(
    slug: string,
    spritesheet: string,
    tileX: number,
    tileY: number,
    facing?: Direction,
  ): void;
  debugPathfindNpc?(slug: string, target: string): Promise<void>;
  debugFaceNpc?(slug: string, direction: Direction): void;
  debugRemoveNpc?(slug: string): boolean;
  debugSetPlayerVisible?(visible: boolean): void;
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
 *
 * The defaults reflect the **complete post-intro state** after STORY-0195
 * through STORY-0202: the player has picked a starter from the bins, beaten
 * Billie, and is free to roam paper_town. Override any of the phase flags
 * (`dantefirst`, `dantebin`, `firstfightend`, etc.) via the top-level fields
 * below, or unset them entirely via `variables: { foo: null }` for QA that
 * wants to drive a specific cutscene from scratch.
 */
export interface SetupGameOptions {
  /** Map to teleport to (default: "spyder_paper_town"). */
  map?: string;
  /** Spawn tile X (default: 20). Chosen for the post-intro town centre. */
  tileX?: number;
  /** Spawn tile Y (default: 11). Free-roam tile north of the mart. */
  tileY?: number;
  /** Campaign choice — written to `scenario_choice` (default: "spyder_campaign"). */
  scenario?: string;
  /** Gender choice — written to `gender_choice` (default: "gender_male"). */
  gender?: string;
  /** Race/appearance choice — written to `race_choice` (default: "white_male"). */
  race?: string;
  /** Monsters to add to party (default: [{ slug: "budaye", level: 5 }]). */
  monsters?: { slug: string; level: number }[];
  /** Items to add to inventory (e.g. [{ slug: "potion", count: 5 }]). */
  items?: { slug: string; count: number }[];
  /** Starting gold (default: 500). */
  money?: number;

  // --- Intro-phase flags. Each maps to a single game variable; the defaults
  // model the post-fight "free to roam" state. Set to `null` to unset for
  // cutscene QA (or override with a specific value).

  /** Whether the player has talked to Dante in the scoop (default: "yes"). */
  dantefirst?: string | null;
  /** Whether the My First Mon bin tutorial has fired (default: "yes"). */
  dantebin?: string | null;
  /** Whether the first fight cutscene is finished (default: "no"). */
  firstfightend?: string | null;

  /**
   * Override / extend any other game variables. Use `null` as a value to
   * explicitly unset a default key.
   */
  variables?: Record<string, string | null>;
}

/**
 * Race → { template, gender } mapping matching start_tuxemon.yaml's per-race
 * `set_template` / `set_char_attribute` blocks. Exported so TitleScene's
 * "New Game" handler can apply the same defaults without going through the
 * cutscene that the YAML used to drive.
 */
export const RACE_DEFAULTS: Record<string, { template: string; gender: string }> = {
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

  /**
   * Read-only access to the current "active" Phaser scene tracked by the
   * bridge — used by modal scenes (e.g. MonsterInfoScene) that need to stash
   * and later restore the previous scene on shutdown.
   */
  getActiveScene(): Phaser.Scene | null {
    return this.activeScene;
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
          stats: {
            hp: m.maxHp,
            melee: m.melee,
            ranged: m.ranged,
            armor: m.armor,
            dodge: m.dodge,
            speed: m.speed,
          },
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

  /**
   * Force technique status-apply rolls to succeed (or restore normal rolling).
   * Used by QA to deterministically demo statuses.
   */
  setForceStatusApply(on: boolean): void {
    debugFlags.forceStatusApply = on;
  }

  /**
   * Force every `random_encounter` action's probability check to pass.
   * Lets QA deterministically trigger wild encounters by stepping onto a
   * grass rect once. Reset to `false` when done so it doesn't leak across
   * runs.
   */
  setForceEncounterRoll(on: boolean): void {
    encounterDebugFlags.forceRoll = on;
  }

  /**
   * Suppress all wild `random_encounter` rolls. Lets cutscene QA opt out of
   * the per-step probability check on grass rects that overlap a scripted
   * event trigger (e.g. route2's Billie column on (1,8) sits inside
   * `random battle28`). Reset to `false` when done.
   */
  setSuppressEncounters(on: boolean): void {
    encounterDebugFlags.suppress = on;
  }

  /** Trigger a wild combat encounter immediately. */
  async startCombat(): Promise<void> {
    const handler = this.getCommandHandler();
    if (handler?.debugStartCombat) {
      handler.debugStartCombat();
    }
  }

  /**
   * Submit a combat action directly to the CombatScene's machine. Returns the
   * resulting event list synchronously. Bypasses menu UI; intended for QA.
   */
  submitCombatAction(action: unknown): { type: string; message: string }[] {
    const handler = this.getCommandHandler();
    if (handler?.debugSubmitCombatAction) {
      return handler.debugSubmitCombatAction(action);
    }
    return [];
  }

  /**
   * Spawn an NPC at a tile for QA testing. The spritesheet must already be
   * preloaded by the active scene (any sheet in `allNpcSpritesheets()` works).
   */
  spawnNpc(
    slug: string,
    spritesheet: string,
    tileX: number,
    tileY: number,
    facing: Direction = "down",
  ): void {
    const handler = this.getCommandHandler();
    if (handler?.debugSpawnNpc) {
      handler.debugSpawnNpc(slug, spritesheet, tileX, tileY, facing);
    }
  }

  /** Make a previously-spawned NPC pathfind toward `target` (slug or "player"). */
  async pathfindNpcTo(slug: string, target: string): Promise<void> {
    const handler = this.getCommandHandler();
    if (handler?.debugPathfindNpc) {
      return handler.debugPathfindNpc(slug, target);
    }
  }

  /**
   * Turn an already-spawned NPC to face a direction (or another character).
   * Routes through the real `char_face` action.
   */
  faceNpc(slug: string, direction: Direction): void {
    const handler = this.getCommandHandler();
    if (handler?.debugFaceNpc) {
      handler.debugFaceNpc(slug, direction);
    }
  }

  /** Despawn an NPC previously created via spawnNpc. Returns false if not found. */
  removeNpc(slug: string): boolean {
    const handler = this.getCommandHandler();
    return handler?.debugRemoveNpc?.(slug) ?? false;
  }

  /** Toggle the player sprite's visibility. Camera still follows the player tile. */
  setPlayerVisible(visible: boolean): void {
    const handler = this.getCommandHandler();
    handler?.debugSetPlayerVisible?.(visible);
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

  /**
   * Open the per-monster info viewer directly (bypasses the `open_journal`
   * event action). Useful for QA — fires the same scene the action launches.
   */
  openMonsterInfo(slug: string): void {
    if (!this.activeScene) throw new Error("No active scene");
    this.activeScene.scene.launch("MonsterInfoScene", { slug });
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

  /** Set the player's display name. Mirrors set_char_attribute name. */
  setPlayerName(name: string): void {
    session.player.name = name;
  }

  /**
   * Override the session's time-of-day stage. Drives day/night branches in
   * the event engine (random_encounter daytime filter, time_is condition,
   * etc.) without waiting for the wall clock to roll over. QA only.
   */
  setTimeStage(stage: "dawn" | "morning" | "day" | "dusk" | "night"): void {
    session.timeStage = stage;
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
   *
   * The default variable values reflect the **complete post-intro state** —
   * character created, bedroom + scoop cutscenes done, Dante's bin tutorial
   * completed, Billie defeated. QA scripts that need to drive a specific
   * cutscene from scratch should null out the gating variables individually
   * via `opts.variables` (e.g. `{ intro_scoop: null }`).
   *
   * Only variables actually consulted by event YAMLs or runtime code are set
   * here — the audit lives in STORY-0198's `setupGame()` cleanup.
   */
  async setupGame(opts: SetupGameOptions = {}): Promise<void> {
    const scenario = opts.scenario ?? "spyder_campaign";
    const gender = opts.gender ?? "gender_male";
    const race = opts.race ?? "white_male";
    const map = opts.map ?? "spyder_paper_town";
    const tileX = opts.tileX ?? 20;
    const tileY = opts.tileY ?? 11;
    const monsters = opts.monsters ?? [{ slug: "budaye", level: 5 }];

    // If the title screen is up (the default boot state on launchGame),
    // teleport() below transitions out of it via scene.start("OverworldScene").
    // No extra setup is needed here — existing QA scripts that only call
    // setupGame() continue to work unchanged.

    // The scoop cutscene records the player's intro choice into both
    // `myintrochoice` (raw choice) and `billie_choice` (sibling mirror used by
    // First Fight to populate Billie's party). Default to the first monster.
    const monsterSlug = monsters[0]?.slug ?? "budaye";

    // Set every gating variable touched by the intro flow. Each is gated on
    // by at least one event in `public/assets/events/`, or read by runtime
    // code. The values mirror what the upstream YAML campaign leaves behind
    // after a full intro playthrough.
    const vars = session.player.gameVariables;

    // start_tuxemon.yaml choices — keep the same scene-rendered values that
    // the cutscene would have written.
    vars.set("scenario_choice", scenario);
    vars.set("gender_choice", gender);
    vars.set("race_choice", race);

    // spyder_bedroom.yaml gates (Intro Question / No Intro / Spyder Intro).
    vars.set("question_intro", "yes");
    vars.set("spyder_intro", "yes");

    // spyder_paper_scoop.yaml gates (Intro Storekeeper / Choice / Continue
    // Storekeeper / Billie <slug>). choice_phase=progress is the terminal
    // state set by Confirm Monster Yes; intro_scoop=done is set on exit.
    vars.set("intro_scoop", "done");
    vars.set("choice_phase", "progress");
    vars.set("myintrochoice", monsterSlug);
    vars.set("billie_choice", monsterSlug);

    // spyder_paper_manor.yaml gates Manor entry on `got_starter:yes`.
    vars.set("got_starter", "yes");

    // spyder_paper_town.yaml first-fight gates. firstfightdue/firstfightend
    // are both consumed and cleared by the fight, so default to "off". The
    // per-bin <slug>chosen markers are intentionally NOT set — the player
    // already has a party (so the Chosen - X events are gated off by
    // party_size>0), and leaving them unset preserves history.
    vars.set("firstfightdue", "no");

    // Top-level phase flags — apply individually so callers can null them.
    const setPhaseVar = (key: string, value: string, override: string | null | undefined) => {
      if (override === null) {
        vars.remove(key);
      } else {
        vars.set(key, override ?? value);
      }
    };
    setPhaseVar("dantefirst", "yes", opts.dantefirst);
    setPhaseVar("dantebin", "yes", opts.dantebin);
    setPhaseVar("firstfightend", "no", opts.firstfightend);

    // Apply caller-supplied variable overrides last so they win over every
    // default. A `null` value unsets the key entirely.
    if (opts.variables) {
      for (const [k, v] of Object.entries(opts.variables)) {
        if (v === null) {
          vars.remove(k);
        } else {
          vars.set(k, v);
        }
      }
    }

    // Set player appearance from race choice (mirrors start_tuxemon's
    // set_template / set_char_attribute pair).
    const raceInfo = RACE_DEFAULTS[race];
    if (raceInfo) {
      session.player.template = raceInfo.template;
      session.player.gender = raceInfo.gender;
    }

    for (const m of monsters) {
      this.addMonster(m.slug, m.level);
    }

    session.player.money = opts.money ?? 500;

    if (opts.items) {
      for (const item of opts.items) {
        this.addItem(item.slug, item.count);
      }
    }

    await this.teleport(map, tileX, tileY);
  }

  /**
   * Launch MathProblemScene with a specific problem, bypassing the skill tree.
   * Useful for QA testing specific widget types.
   */
  async showProblem(problem: PerseusProblem): Promise<void> {
    if (!this.activeScene) throw new Error("No active scene");
    const scene = this.activeScene.scene;
    scene.launch("MathProblemScene", { problem, returnScene: scene.key });
    scene.pause();
    return new Promise((resolve) => {
      const check = () => {
        if (this.activeScene?.scene.key === "MathProblemScene") {
          resolve();
          return;
        }
        nextFrame(check);
      };
      nextFrame(check);
    });
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
