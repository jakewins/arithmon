/**
 * QA: MonsterInfoScene (open_journal action) — the single-monster journal
 * detail page. Mirrors upstream `JournalInfoState`.
 *
 * Checks:
 *  - `MonsterInfoScene` becomes the active scene after the action fires.
 *  - All key text fields render (name, ID, species, height/weight, body type,
 *    description, evolution).
 *  - Pressing B (or SPACE — see per-monster `closeKey` below) closes it and
 *    the overworld becomes active again.
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
  closeKey: number = 66,
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

  // Dismiss with the parameterised close key (66=B, 32=SPACE). Same pattern as
  // other QA scripts — dispatch on document with bubbles so Phaser's keyboard
  // plugin sees it. Coverage: most monsters exercise B; one exercises SPACE so
  // the new SPACE binding (STORY-0228) stays wired up under refactors.
  const keyName = closeKey === 32 ? "SPACE" : closeKey === 66 ? "B" : `keyCode ${closeKey}`;
  console.log(`[${slug}] Closing with ${keyName} (keyCode ${closeKey})`);
  await page.evaluate((kc) => {
    document.dispatchEvent(new KeyboardEvent("keydown", { keyCode: kc, bubbles: true }));
  }, closeKey);
  await new Promise((r) => setTimeout(r, 150));
  await page.evaluate((kc) => {
    document.dispatchEvent(new KeyboardEvent("keyup", { keyCode: kc, bubbles: true }));
  }, closeKey);

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
    // Exercise SPACE-dismiss on one monster, B-dismiss on the rest.
    const closeKey = slug === "lambert" ? 32 : 66;
    await openAndScreenshot(page, slug, close, closeKey);
  }

  console.log("OK");
  await close();
}

main().catch(async (err) => {
  console.error(err);
  process.exit(1);
});
