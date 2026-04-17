# STORY-0042: Playwright Harness for Agent QA

## Description

Set up a Playwright-based harness that lets an AI agent (or developer) launch the game in a real browser and interact with it via the debug API. This is **not** a CI test suite — it's an interactive QA tool for a coding agent to verify her changes while working on a feature.

The typical workflow:
1. Agent makes code changes to the game
2. Agent starts the dev server (`npm run dev`)
3. Agent writes a short throwaway script that launches a headed browser, navigates to the game, and exercises the feature under test using `A.walkTo()`, `A.interact()`, `A.getState()`, etc.
4. Agent reads game state and event logs to verify behavior
5. Agent takes a screenshot only when visual verification is needed (e.g., "does the dialog box look right?")
6. The browser stays visible so a human pair can watch and help if needed

### Setup

- Install Playwright as a dev dependency (`@playwright/test` + browser binaries)
- Create `qa/` directory (not `tests/e2e/` — this isn't a persistent test suite)
- Create `qa/harness.ts` — reusable helpers for agent QA scripts

### Harness API (`qa/harness.ts`)

```ts
import { chromium, type Page } from "@playwright/test";

/** Launch the game in a headed browser, wait for it to be ready */
export async function launchGame(): Promise<{ page: Page; close: () => Promise<void> }>;

/** Typed wrapper around page.evaluate(() => A.foo()) */
export async function getState(page: Page): Promise<GameState>;
export async function walkTo(page: Page, x: number, y: number, facing?: string): Promise<void>;
export async function interact(page: Page): Promise<void>;
export async function selectChoice(page: Page, index: number): Promise<void>;
export async function waitForIdle(page: Page): Promise<void>;
export async function waitForEvent(page: Page, type: string): Promise<DebugEvent>;
export async function getEvents(page: Page): Promise<DebugEvent[]>;
export async function screenshot(page: Page, name: string): Promise<string>; // returns file path
```

The harness launches Chromium **headed** (not headless) by default, with a window size matching the game's scaled resolution. Screenshots go to `qa/screenshots/`.

### Example QA script

An agent working on, say, the dialog system would write a one-off script like:

```ts
// qa/check-dialog.ts
import { launchGame, walkTo, interact, waitForEvent, getState, screenshot } from "./harness";

const { page, close } = await launchGame();

// Walk to the NPC
await walkTo(page, 8, 12);

// Talk to them
await interact(page);
const event = await waitForEvent(page, "dialog_opened");
console.log("Dialog text:", event.data.text);

// Check it looks right
await screenshot(page, "dialog-box");

// Verify state
const state = await getState(page);
console.log("Player at:", state.player.tileX, state.player.tileY);

await close();
```

Run with: `npx tsx qa/check-dialog.ts`

The script is disposable — the agent writes it, runs it, reads the output, and may delete it afterward. It's a QA scratch pad, not a regression suite.

### Configuration

- Add a `qa` script to `package.json`: `"qa": "tsx"` so agents can run `npm run qa qa/check-dialog.ts`
- Add `qa/screenshots/` to `.gitignore`
- Playwright config is not needed — the harness calls `chromium.launch()` directly

### Tasks

1. Install `@playwright/test` and `tsx` as dev dependencies
2. Install Chromium browser binary (`npx playwright install chromium`)
3. Create `qa/harness.ts` with `launchGame()` and wrapper functions
4. Create `qa/smoke.ts` — minimal example that launches the game, waits for ready, gets state, takes a screenshot
5. Add `qa/screenshots/` to `.gitignore`
6. Add `qa` npm script

## Acceptance Criteria

- [ ] `npx tsx qa/smoke.ts` launches the game in a visible browser, gets game state, takes a screenshot, and exits
- [ ] Harness provides typed wrappers for all debug API commands
- [ ] Browser is headed by default (visible to humans)
- [ ] Screenshots are saved to `qa/screenshots/`
- [ ] Harness is designed for one-off agent QA scripts, not persistent test suites
- [ ] All code passes formatter, linter, typecheck, and tests
