/**
 * QA: MonsterInfoScene (open_journal action) — the single-monster journal
 * detail page. Mirrors upstream `JournalInfoState`.
 *
 * Checks:
 *  - `MonsterInfoScene` becomes the active scene after the action fires.
 *  - All key text fields render (name, ID, species, height/weight, body type,
 *    description, evolution).
 *  - Pressing B closes it and the overworld becomes active again.
 *
 * Iterates every monster currently populated with viewer fields so screenshots
 * cover the worst-case label widths (e.g. "Cute Boulder Species",
 * "Body Type: Hunter") and let the reviewer verify all labels fit the cream
 * panel.
 */

import { launchGame, setupGame, screenshot } from "./harness";

// Slugs in `src/game/data/monsters.ts` that have the viewer fields populated
// (txmnId, species, height, weight, shape, descriptionKey, evolutions).
const VIEWER_MONSTERS = ["rockitten", "lambert", "nut", "tweesher", "agnite"] as const;

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

async function openAndScreenshot(
  page: import("playwright").Page,
  slug: string,
  close: () => Promise<void>,
) {
  await page.evaluate((s) => window.A!.openMonsterInfo(s), slug);

  await page.waitForFunction(
    () => (window.A!.getState() as { scene?: string }).scene === "MonsterInfoScene",
    null,
    { timeout: 5000 },
  );

  const active = await getActiveSceneName(page);
  console.log(`[${slug}] Active scene after launch:`, active);
  if (active !== "MonsterInfoScene") {
    await fail(`[${slug}] MonsterInfoScene not active; got ${active}`, close);
  }

  const state = await getState(page);
  console.log(`[${slug}] Debug state.monsterInfo:`, JSON.stringify(state.monsterInfo));

  await screenshot(page, `monster-info-${slug}`);

  // Press B (key code 66) to dismiss. Same pattern as other QA scripts —
  // dispatch on document with bubbles so Phaser's keyboard plugin sees it.
  await page.evaluate(() => {
    document.dispatchEvent(new KeyboardEvent("keydown", { keyCode: 66, bubbles: true }));
  });
  await new Promise((r) => setTimeout(r, 150));
  await page.evaluate(() => {
    document.dispatchEvent(new KeyboardEvent("keyup", { keyCode: 66, bubbles: true }));
  });

  // Wait for scene to shut down before moving on to the next monster.
  await page.waitForFunction(
    () => (window.A!.getState() as { scene?: string }).scene !== "MonsterInfoScene",
    null,
    { timeout: 5000 },
  );

  const after = await getActiveSceneName(page);
  console.log(`[${slug}] Active scene after close:`, after);
  if (after !== "OverworldScene") {
    await fail(`[${slug}] OverworldScene not active after close; got ${after}`, close);
  }
}

async function main() {
  const { page, close } = await launchGame();
  await setupGame(page, { map: "spyder_paper_town", tileX: 22, tileY: 9 });

  for (const slug of VIEWER_MONSTERS) {
    await openAndScreenshot(page, slug, close);
  }

  console.log("OK");
  await close();
}

main().catch(async (err) => {
  console.error(err);
  process.exit(1);
});
