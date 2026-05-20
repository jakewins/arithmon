import { chromium, type Page } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export interface DebugEvent {
  type: string;
  time: number;
  data: Record<string, unknown>;
}

export interface SetupGameOptions {
  map?: string;
  tileX?: number;
  tileY?: number;
  scenario?: string;
  gender?: string;
  race?: string;
  monsters?: { slug: string; level: number }[];
  items?: { slug: string; count: number }[];
  money?: number;
}

/** Problem data passed to showProblem. Matches PerseusProblem from src/game/data/problems.ts */
export interface PerseusProblem {
  id: string;
  standard: string;
  question: {
    content: string;
    widgets: Record<string, unknown>;
  };
  hints: { content: string }[];
}

/** Minimal typing for the debug bridge exposed as window.A in the game. */
interface DebugBridgeAPI {
  ready: boolean;
  events: readonly DebugEvent[];
  getState(): Record<string, unknown>;
  interact(): Promise<void>;
  walkTo(x: number, y: number, facing?: string): Promise<void>;
  walkStep(dir: "up" | "down" | "left" | "right"): Promise<{ tileX: number; tileY: number }>;
  selectChoice(index: number): Promise<void>;
  typeAnswer(text: string): Promise<void>;
  submitAnswer(): Promise<void>;
  startCombat(): Promise<void>;
  setForceStatusApply(on: boolean): void;
  spawnBattle(
    playerSlug: string,
    enemySlug: string,
    playerLevel?: number,
    enemyLevel?: number,
    environment?: string,
  ): Promise<void>;
  submitCombatAction(action: unknown): { type: string; message: string }[];
  waitForIdle(): Promise<void>;
  waitForEvent(type: string): Promise<DebugEvent>;
  teleport(mapKey: string, tileX: number, tileY: number): Promise<void>;
  setVariable(key: string, value: string): void;
  setLayer(rgba?: string): void;
  openJournal(): void;
  openMonsterInfo(slug: string): void;
  setupGame(opts?: SetupGameOptions): Promise<void>;
  showProblem(problem: PerseusProblem): Promise<void>;
  spawnNpc(
    slug: string,
    spritesheet: string,
    tileX: number,
    tileY: number,
    facing?: "up" | "down" | "left" | "right",
  ): void;
  pathfindNpcTo(slug: string, target: string): Promise<void>;
  faceNpc(slug: string, direction: "up" | "down" | "left" | "right"): void;
  removeNpc(slug: string): boolean;
  setPlayerVisible(visible: boolean): void;
}

declare global {
  interface Window {
    A?: DebugBridgeAPI;
  }
}

const GAME_URL = `http://localhost:${process.env.ARITHMON_PORT || "8080"}`;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_DIR = path.join(__dirname, "screenshots");

// Game renders at 320x240 with 3x zoom = 960x720
const VIEWPORT = { width: 960, height: 720 };

/** Resolve the chromium executable: env var > `which chromium` > Playwright default. */
function findChromium(): string | undefined {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) {
    return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  }
  try {
    return execSync("which chromium", { encoding: "utf-8" }).trim();
  } catch {
    return undefined; // fall through to Playwright bundled
  }
}

/** Launch the game in a headed browser, wait for it to be ready. */
export async function launchGame(): Promise<{
  page: Page;
  close: () => Promise<void>;
}> {
  const browser = await chromium.launch({
    headless: process.env.HEADLESS === "1" ? true : false,
    executablePath: findChromium(),
  });
  const page = await browser.newPage({ viewport: VIEWPORT });

  // Capture browser errors and console errors. Any of these crash the harness
  // as soon as they fire — we want game-runtime errors to blow up the test
  // immediately, not silently log and let the script keep running.
  const browserErrors: string[] = [];
  const fail = (source: string, message: string) => {
    browserErrors.push(message);
    console.error(`[BROWSER ${source}]`, message);
    // Inject the error into the page so any pending evaluate() call rejects,
    // breaking the test out of whatever it was waiting on.
    page
      .evaluate((m) => {
        throw new Error(m);
      }, `Game runtime ${source.toLowerCase()}: ${message}`)
      .catch(() => {
        /* expected — we're forcing the rejection */
      });
  };
  page.on("pageerror", (err) => fail("ERROR", err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") fail("CONSOLE ERROR", msg.text());
  });

  await page.goto(GAME_URL);

  // Wait for the debug bridge to be ready
  await page.waitForFunction(() => window.A?.ready, null, { timeout: 30_000 });

  // Fail fast if the game hit errors during startup
  if (browserErrors.length > 0) {
    await browser.close();
    throw new Error(
      `Game threw ${browserErrors.length} error(s) during startup:\n${browserErrors.join("\n")}`,
    );
  }

  return {
    page,
    close: async () => {
      await browser.close();
      if (browserErrors.length > 0) {
        throw new Error(
          `${browserErrors.length} browser error(s) during session:\n${browserErrors.join("\n")}`,
        );
      }
    },
  };
}

/** Get a snapshot of the current game state. */
export async function getState(page: Page): Promise<Record<string, unknown>> {
  return page.evaluate(() => window.A!.getState());
}

/** Walk the player to a tile using A* pathfinding. */
export async function walkTo(page: Page, x: number, y: number, facing?: string): Promise<void> {
  await page.evaluate(
    ({ x, y, facing }) => window.A!.walkTo(x, y, facing as "up" | "down" | "left" | "right"),
    { x, y, facing },
  );
}

/** Simulate pressing the interact button. */
export async function interact(page: Page): Promise<void> {
  await page.evaluate(() => window.A!.interact());
}

/** Select a dialog choice by 0-based index. */
export async function selectChoice(page: Page, index: number): Promise<void> {
  await page.evaluate((i) => window.A!.selectChoice(i), index);
}

/**
 * Walk the player one tile in the given direction using the normal input
 * code path (respects directional restrictions and physics).
 * Returns the player's tile position after the step.
 */
export async function walkStep(
  page: Page,
  dir: "up" | "down" | "left" | "right",
): Promise<{ tileX: number; tileY: number }> {
  return page.evaluate(
    (d) => window.A!.walkStep(d as "up" | "down" | "left" | "right"),
    dir,
  ) as Promise<{ tileX: number; tileY: number }>;
}

/** Trigger a wild combat encounter immediately. */
export async function startCombat(page: Page): Promise<void> {
  await page.evaluate(() => window.A!.startCombat());
}

/** Wait until the event engine is no longer blocking. */
export async function waitForIdle(page: Page): Promise<void> {
  await page.evaluate(() => window.A!.waitForIdle());
}

/** Wait for a specific event type. Returns the matching event. */
export async function waitForEvent(page: Page, type: string): Promise<DebugEvent> {
  return page.evaluate((t) => window.A!.waitForEvent(t), type) as Promise<DebugEvent>;
}

/** Get all events from the rolling buffer. */
export async function getEvents(page: Page): Promise<DebugEvent[]> {
  return page.evaluate(() => [...window.A!.events]) as Promise<DebugEvent[]>;
}

/** Teleport the player to a specific map and tile. Skips cutscenes/menus. */
export async function teleport(
  page: Page,
  mapKey: string,
  tileX: number,
  tileY: number,
): Promise<void> {
  await page.evaluate(({ mapKey, tileX, tileY }) => window.A!.teleport(mapKey, tileX, tileY), {
    mapKey,
    tileX,
    tileY,
  });
}

/** Set a game variable via the debug bridge. */
export async function setVariable(page: Page, key: string, value: string): Promise<void> {
  await page.evaluate(({ key, value }) => window.A!.setVariable(key, value), { key, value });
}

/** Take a screenshot, saved to qa/screenshots/<name>.png. Returns the file path. */
export async function screenshot(page: Page, name: string): Promise<string> {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: filePath });
  return filePath;
}

/**
 * Skip the intro sequence and teleport to a ready-to-play state.
 * Sets character creation variables, adds starter monster(s), and teleports.
 *
 * Usage:
 *   const { page, close } = await launchGame();
 *   await setupGame(page, { map: "spyder_cotton_town", tileX: 20, tileY: 20 });
 */
export async function setupGame(page: Page, opts: SetupGameOptions = {}): Promise<void> {
  await page.evaluate((o) => window.A!.setupGame(o), opts);
}

/** Launch MathProblemScene with a specific problem, bypassing combat/encounter flow. */
export async function showProblem(page: Page, problem: PerseusProblem): Promise<void> {
  await page.evaluate(
    (p) => window.A!.showProblem(p as unknown as Parameters<typeof window.A.showProblem>[0]),
    problem,
  );
}

/** Type an answer into the math problem scene via the debug bridge. */
export async function typeAnswer(page: Page, text: string): Promise<void> {
  await page.evaluate((t) => window.A!.typeAnswer(t), text);
}

/** Submit the current math problem answer via the debug bridge. */
export async function submitAnswer(page: Page): Promise<void> {
  await page.evaluate(() => window.A!.submitAnswer());
}

export type Direction = "up" | "down" | "left" | "right";

/**
 * Spawn an NPC at a tile via the real create_npc action. The spritesheet
 * must already be preloaded by the active scene.
 */
export async function spawnNpc(
  page: Page,
  slug: string,
  spritesheet: string,
  tileX: number,
  tileY: number,
  facing: Direction = "down",
): Promise<void> {
  await page.evaluate(
    ({ slug, spritesheet, tileX, tileY, facing }) =>
      window.A!.spawnNpc(slug, spritesheet, tileX, tileY, facing),
    { slug, spritesheet, tileX, tileY, facing },
  );
}

/** Run a real pathfind_to_char action for a previously-spawned NPC. */
export async function pathfindNpcTo(page: Page, slug: string, target: string): Promise<void> {
  await page.evaluate(
    ({ slug, target }) => window.A!.pathfindNpcTo(slug, target),
    { slug, target },
  );
}

/** Face an already-spawned NPC in a direction via the real char_face action. */
export async function faceNpc(page: Page, slug: string, direction: Direction): Promise<void> {
  await page.evaluate(
    ({ slug, direction }) => window.A!.faceNpc(slug, direction),
    { slug, direction },
  );
}

/** Despawn an NPC previously created via spawnNpc. Resolves to true if removed. */
export async function removeNpc(page: Page, slug: string): Promise<boolean> {
  return page.evaluate((s) => window.A!.removeNpc(s), slug);
}

/** Toggle the player sprite's visibility. Camera still follows the player tile. */
export async function setPlayerVisible(page: Page, visible: boolean): Promise<void> {
  await page.evaluate((v) => window.A!.setPlayerVisible(v), visible);
}

export interface SetupNpcStageOptions {
  /** Map to use as the neutral stage (default: "qa_npc_stage"). */
  map?: string;
  /** Player spawn tile X (default: 5, center of qa_npc_stage). */
  tileX?: number;
  /** Player spawn tile Y (default: 5, center of qa_npc_stage). */
  tileY?: number;
  /** Whether to hide the player sprite (default: true). */
  hidePlayer?: boolean;
}

/**
 * Boot the game into a dedicated neutral interior (qa_npc_stage — a clone
 * of spyder_cotton_house1 with all event objects stripped) and hide the
 * player. Real OverworldScene, real collisions, real pathfinding grid;
 * nothing on the map spawns NPCs or fires events, so spawned QA subjects
 * are unobstructed.
 *
 * Camera follows the (invisible) player tile, so spawn NPCs on or near
 * (tileX, tileY) to keep them in frame.
 */
export async function setupNpcStage(
  page: Page,
  opts: SetupNpcStageOptions = {},
): Promise<{ tileX: number; tileY: number }> {
  const map = opts.map ?? "qa_npc_stage";
  const tileX = opts.tileX ?? 5;
  const tileY = opts.tileY ?? 5;
  await setupGame(page, { map, tileX, tileY });
  if (opts.hidePlayer !== false) {
    await setPlayerVisible(page, false);
  }
  return { tileX, tileY };
}
