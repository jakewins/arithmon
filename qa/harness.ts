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
  startCombat(): Promise<void>;
  waitForIdle(): Promise<void>;
  waitForEvent(type: string): Promise<DebugEvent>;
  teleport(mapKey: string, tileX: number, tileY: number): Promise<void>;
  setVariable(key: string, value: string): void;
  setLayer(rgba?: string): void;
  openJournal(): void;
  setupGame(opts?: SetupGameOptions): Promise<void>;
}

declare global {
  interface Window {
    A?: DebugBridgeAPI;
  }
}

const GAME_URL = "http://localhost:8080";
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
    headless: false,
    executablePath: findChromium(),
  });
  const page = await browser.newPage({ viewport: VIEWPORT });
  await page.goto(GAME_URL);

  // Wait for the debug bridge to be ready
  await page.waitForFunction(() => window.A?.ready, null, { timeout: 30_000 });

  return {
    page,
    close: async () => {
      await browser.close();
    },
  };
}

/** Get a snapshot of the current game state. */
export async function getState(
  page: Page,
): Promise<Record<string, unknown>> {
  return page.evaluate(() => window.A!.getState());
}

/** Walk the player to a tile using A* pathfinding. */
export async function walkTo(
  page: Page,
  x: number,
  y: number,
  facing?: string,
): Promise<void> {
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
export async function selectChoice(
  page: Page,
  index: number,
): Promise<void> {
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
export async function waitForEvent(
  page: Page,
  type: string,
): Promise<DebugEvent> {
  return page.evaluate(
    (t) => window.A!.waitForEvent(t),
    type,
  ) as Promise<DebugEvent>;
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
  await page.evaluate(
    ({ mapKey, tileX, tileY }) => window.A!.teleport(mapKey, tileX, tileY),
    { mapKey, tileX, tileY },
  );
}

/** Set a game variable via the debug bridge. */
export async function setVariable(
  page: Page,
  key: string,
  value: string,
): Promise<void> {
  await page.evaluate(({ key, value }) => window.A!.setVariable(key, value), { key, value });
}

/** Take a screenshot, saved to qa/screenshots/<name>.png. Returns the file path. */
export async function screenshot(
  page: Page,
  name: string,
): Promise<string> {
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
 *   await setupGame(page, { map: "cotton_town", tileX: 20, tileY: 19 });
 */
export async function setupGame(
  page: Page,
  opts: SetupGameOptions = {},
): Promise<void> {
  await page.evaluate((o) => window.A!.setupGame(o), opts);
}
