import { chromium, type Page } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

export interface DebugEvent {
  type: string;
  time: number;
  data: Record<string, unknown>;
}

/** Minimal typing for the debug bridge exposed as window.A in the game. */
interface DebugBridgeAPI {
  ready: boolean;
  events: readonly DebugEvent[];
  getState(): Record<string, unknown>;
  interact(): Promise<void>;
  walkTo(x: number, y: number, facing?: string): Promise<void>;
  selectChoice(index: number): Promise<void>;
  waitForIdle(): Promise<void>;
  waitForEvent(type: string): Promise<DebugEvent>;
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

/** Launch the game in a headed browser, wait for it to be ready. */
export async function launchGame(): Promise<{
  page: Page;
  close: () => Promise<void>;
}> {
  const browser = await chromium.launch({
    headless: false,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
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
