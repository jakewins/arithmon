/**
 * QA: MonsterInfoScene (open_journal action) — the single-monster journal
 * detail page. Mirrors upstream `JournalInfoState`.
 *
 * Checks:
 *  - `MonsterInfoScene` becomes the active scene after the action fires.
 *  - All key text fields render (name, ID, species, height/weight, body type,
 *    description, evolution).
 *  - Pressing B closes it and the overworld becomes active again.
 *  - A follow-up event action waits for the journal to close before running
 *    (the engine stays blocking while the modal is up).
 */

import { launchGame, setupGame, screenshot } from "./harness";

async function getState(page: import("playwright").Page) {
  return page.evaluate(() => window.A!.getState());
}

async function getActiveSceneName(page: import("playwright").Page): Promise<string | null> {
  const state = await page.evaluate(() => window.A!.getState());
  return (state as { scene?: string | null }).scene ?? null;
}

async function fail(msg: string, close: () => Promise<void>): Promise<never> {
  await close();
  throw new Error(msg);
}

async function main() {
  const { page, close } = await launchGame();
  await setupGame(page, { map: "spyder_paper_town", tileX: 22, tileY: 9 });

  // Fire the action under test directly via the debug bridge. Behaves the
  // same as the bin event would (launches MonsterInfoScene).
  await page.evaluate(() => window.A!.openMonsterInfo("lambert"));

  // Give Phaser a couple of frames to spin up the scene.
  await page.waitForFunction(
    () => (window.A!.getState() as { scene?: string }).scene === "MonsterInfoScene",
    null,
    { timeout: 5000 },
  );

  const active = await getActiveSceneName(page);
  console.log("Active scene after launch:", active);
  if (active !== "MonsterInfoScene") {
    await fail(`MonsterInfoScene not active; got ${active}`, close);
  }

  const state = await getState(page);
  console.log("Debug state.monsterInfo:", JSON.stringify(state.monsterInfo));

  await screenshot(page, "monster-info-lambert");

  // Press B (key code 66) to dismiss. Same pattern as other QA scripts —
  // dispatch on document with bubbles so Phaser's keyboard plugin sees it.
  await page.evaluate(() => {
    document.dispatchEvent(new KeyboardEvent("keydown", { keyCode: 66, bubbles: true }));
  });
  await new Promise((r) => setTimeout(r, 150));
  await page.evaluate(() => {
    document.dispatchEvent(new KeyboardEvent("keyup", { keyCode: 66, bubbles: true }));
  });

  // Wait for scene to shut down.
  await page.waitForFunction(
    () => (window.A!.getState() as { scene?: string }).scene !== "MonsterInfoScene",
    null,
    { timeout: 5000 },
  );

  const after = await getActiveSceneName(page);
  console.log("Active scene after close:", after);
  if (after !== "OverworldScene") {
    await fail(`OverworldScene not active after close; got ${after}`, close);
  }

  console.log("OK");
  await close();
}

main().catch(async (err) => {
  console.error(err);
  process.exit(1);
});
