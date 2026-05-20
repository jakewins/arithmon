import { launchGame, getState, screenshot } from "./harness";
import type { Page } from "@playwright/test";

/** Press a key via document dispatch (Phaser listens on document). */
async function pressKey(page: Page, keyCode: number) {
  await page.evaluate((kc) => {
    document.dispatchEvent(new KeyboardEvent("keydown", { keyCode: kc, bubbles: true }));
  }, keyCode);
  await page.waitForTimeout(80);
  await page.evaluate((kc) => {
    document.dispatchEvent(new KeyboardEvent("keyup", { keyCode: kc, bubbles: true }));
  }, keyCode);
  await page.waitForTimeout(80);
}

const KEY_ENTER = 13;

interface FullState {
  scene: string;
  mapKey?: string;
  player?: { tileX: number; tileY: number; facing: string };
  session?: { variables?: Record<string, string> };
}

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

/**
 * Drive a fresh boot from the title screen → start_tuxemon cutscene →
 * spyder_bedroom intro state. Returns the page with the "Intro Question"
 * dialog open. Uses A.selectChoice to walk through the three character-
 * creation choices (covered standalone by character-creation-test.ts).
 */
async function bootIntoBedroom(): Promise<{ page: Page; close: () => Promise<void> }> {
  const session = await launchGame();
  const { page } = session;

  // Clear any leftover save so we always exercise the New Game path.
  await page.evaluate(() => localStorage.removeItem("arithmon_save"));
  await page.reload();
  await page.waitForFunction(() => window.A?.ready, null, { timeout: 30_000 });

  await pressKey(page, KEY_ENTER); // confirm "New Game" → CutsceneScene
  await page.waitForFunction(
    () => window.A?.getState().scene === "CutsceneScene",
    null,
    { timeout: 10_000 },
  );

  // Walk the three start_tuxemon choices: campaign → gender → race. The
  // cutscene transitions to OverworldScene on the final choice via
  // transition_teleport, landing the player at spyder_bedroom (4,4).
  let seenChoices = 0;
  for (const choice of [0 /* spyder_campaign */, 0 /* gender_male */, 1 /* white_male */]) {
    seenChoices += 1;
    await page.waitForFunction(
      (need) => window.A!.events.filter((e) => e.type === "choice_presented").length >= need,
      seenChoices,
      { timeout: 5_000 },
    );
    await page.evaluate((i) => window.A!.selectChoice(i), choice);
    await page.waitForTimeout(150);
  }

  await page.waitForFunction(
    () => window.A?.getState().scene === "OverworldScene",
    null,
    { timeout: 10_000 },
  );

  // The bedroom's "Intro Question" event fires on first update tick and opens
  // a dialog. Wait for it to appear in the event log.
  await page.waitForFunction(
    () => window.A!.events.some((e) => e.type === "dialog_opened"),
    null,
    { timeout: 5_000 },
  );

  return session;
}

/**
 * Advance the intro question dialog until the choice prompt appears.
 * The dialog has a typewriter effect so the first interact may just complete
 * the page render — keep pressing until the choice opens.
 */
async function advanceToChoice(page: Page): Promise<void> {
  // The rolling event buffer already contains the three choice_presented
  // events from the preceding start_tuxemon character-creation flow, so we
  // wait for a new one to appear by counting against the baseline.
  const baseline: number = await page.evaluate(
    () => window.A!.events.filter((e) => e.type === "choice_presented").length,
  );
  for (let i = 0; i < 8; i++) {
    await page.evaluate(() => window.A!.interact());
    await page.waitForTimeout(150);
    const count: number = await page.evaluate(
      () => window.A!.events.filter((e) => e.type === "choice_presented").length,
    );
    if (count > baseline) return;
  }
  throw new Error("Intro Question choice never appeared after 8 interact presses");
}

/** Press interact until we leave the bedroom (mapKey changes). */
async function advanceUntilLeaveBedroom(page: Page, maxSteps = 40): Promise<number> {
  for (let i = 0; i < maxSteps; i++) {
    const state = (await getState(page)) as FullState;
    if (state.mapKey === "spyder_paper_scoop") return i;
    await page.evaluate(() => window.A!.interact());
    await page.waitForTimeout(180);
  }
  throw new Error(`Did not reach spyder_paper_scoop after ${maxSteps} interacts`);
}

async function testSkipPath(): Promise<void> {
  console.log("[skip path] booting...");
  const { page, close } = await bootIntoBedroom();

  // Verify we landed on the rug at (4,4).
  const initial = (await getState(page)) as FullState;
  assert(
    initial.player?.tileX === 4 && initial.player?.tileY === 4,
    `expected player at (4,4), got (${initial.player?.tileX},${initial.player?.tileY})`,
  );
  assert(initial.mapKey === "spyder_bedroom", `expected mapKey=spyder_bedroom, got ${initial.mapKey}`);

  // Screenshot mid-prompt — should show bedroom with player on rug + dialog.
  await page.waitForTimeout(300);
  await screenshot(page, "bedroom-intro-prompt");

  await advanceToChoice(page);

  // Choice options are "no:yes" — index 1 = yes (skip).
  await page.evaluate(() => window.A!.selectChoice(1));
  await page.waitForTimeout(500);

  const afterChoice = (await getState(page)) as FullState;
  assert(
    afterChoice.session?.variables?.question_intro === "yes",
    `expected question_intro=yes after skip, got ${afterChoice.session?.variables?.question_intro}`,
  );

  // The "No Intro" event fires once question_intro=yes and spyder_intro is
  // unset, setting spyder_intro=yes and teleporting. Wait briefly for it.
  await page.waitForTimeout(1500);
  const final = (await getState(page)) as FullState;
  assert(
    final.session?.variables?.spyder_intro === "yes",
    `expected spyder_intro=yes after skip teleport, got ${final.session?.variables?.spyder_intro}`,
  );
  assert(
    final.mapKey === "spyder_paper_scoop",
    `expected mapKey=spyder_paper_scoop after skip, got ${final.mapKey}`,
  );
  assert(
    final.player?.tileX === 4 && final.player?.tileY === 8,
    `expected player at (4,8) in scoop, got (${final.player?.tileX},${final.player?.tileY})`,
  );

  await close();
  console.log("[skip path] OK");
}

async function testCinematicPath(): Promise<void> {
  console.log("[cinematic path] booting...");
  const { page, close } = await bootIntoBedroom();
  await advanceToChoice(page);

  // Choose "no" — option index 0 — to play the cinematic.
  await page.evaluate(() => window.A!.selectChoice(0));
  await page.waitForTimeout(500);

  const afterChoice = (await getState(page)) as FullState;
  assert(
    afterChoice.session?.variables?.question_intro === "no",
    `expected question_intro=no after cinematic choice, got ${afterChoice.session?.variables?.question_intro}`,
  );

  // Snapshot the first cinematic slide so a human reviewer can spot a
  // regression in the change_bg_char overlay (CEO sprite on blue backdrop).
  await page.waitForTimeout(400);
  await screenshot(page, "bedroom-intro-cinematic-ceo");

  const steps = await advanceUntilLeaveBedroom(page);
  console.log(`[cinematic path] reached scoop after ${steps} interact presses`);

  const final = (await getState(page)) as FullState;
  assert(
    final.mapKey === "spyder_paper_scoop",
    `expected mapKey=spyder_paper_scoop after cinematic, got ${final.mapKey}`,
  );
  assert(
    final.player?.tileX === 4 && final.player?.tileY === 8,
    `expected player at (4,8) in scoop, got (${final.player?.tileX},${final.player?.tileY})`,
  );
  assert(
    final.session?.variables?.spyder_intro === "yes",
    `expected spyder_intro=yes after cinematic, got ${final.session?.variables?.spyder_intro}`,
  );

  await close();
  console.log("[cinematic path] OK");
}

async function main(): Promise<void> {
  await testSkipPath();
  await testCinematicPath();
  console.log("bedroom-intro-test: OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
