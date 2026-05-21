/**
 * QA: SMALL/SMALL_HEADING text fidelity across every surface the user might
 * see them on (STORY-0229).
 *
 * PressStart2P at 6 px rendered as fat irregular blobs because its TTF
 * outlines are designed for 8 px integer multiples — see STORY-0229 for the
 * H1 sweep. SMALL/SMALL_HEADING now render in Pizel (a true 5×7-design pixel
 * font, upstream Tuxemon's `thin_font_file`). This suite re-screenshots the
 * three surfaces the story names as canonical so the fix can be verified
 * against the example crop checked into the story directory.
 *
 * Coverage:
 *  - Combat scene: "What will <player> do?" prompt, HUD names, DP label,
 *    attack info card.
 *  - Monster info screen: ID / Type(s) / Body Type / Evolutions rows.
 *
 * Unlike `pixel-font-readability.ts`, this script's only job is the four
 * shots above. It does not exercise every text surface; that's
 * STORY-0208's suite, which we re-run separately to confirm no regression
 * on BODY/TITLE/NAME (those stay PressStart2P).
 */

import { launchGame, setupGame, screenshot, waitForIdle } from "./harness";
import type { Page } from "@playwright/test";

async function waitForScene(page: Page, name: string, timeoutMs = 8000): Promise<void> {
  await page.waitForFunction(
    (n) => (window.A!.getState() as { scene?: string }).scene === n,
    name,
    { timeout: timeoutMs },
  );
}

/**
 * CombatScene runs an intro ("A wild X appeared!") before the FIGHT/TUXEMON
 * menu paints. Poll the combat state machine until `menuMode === "main"`;
 * page.waitForFunction's serialized callback doesn't reliably re-read the
 * cross-frame property reads inside `window.A!.getState()`.
 */
async function waitForMainMenu(page: Page): Promise<void> {
  let lastSeen = "<none>";
  for (let i = 0; i < 80; i++) {
    const probe = await page.evaluate(() => {
      const st = window.A!.getState() as Record<string, unknown>;
      const c = st.combat as { menuMode?: string } | undefined;
      return { scene: st.scene, menuMode: c?.menuMode ?? null };
    });
    lastSeen = JSON.stringify(probe);
    if (probe.menuMode === "main") return;
    await page.waitForTimeout(100);
  }
  throw new Error(`waitForMainMenu: combat menuMode never reached 'main' (last: ${lastSeen})`);
}

/** Combat scene → main menu (HUD names + "What will X do?" + DP label). */
async function checkCombatScene(page: Page): Promise<void> {
  await page.evaluate(() => window.A!.spawnBattle("budaye", "rockitten", 5, 5, "grass"));
  await waitForScene(page, "CombatScene");
  await waitForMainMenu(page);
  // Settle a frame so the menu cursor + DP pips are fully painted.
  await page.waitForTimeout(400);
  await screenshot(page, "text-fidelity-combat-prompt");

  // Open FIGHT submenu — exercises the SMALL attack info card (name,
  // accuracy %, range pill + power, cost line).
  await page.evaluate(() => window.A!.selectChoice(0));
  await page.waitForTimeout(300);
  await screenshot(page, "text-fidelity-combat-hud");
}

/** Monster info screen — the densest SMALL/SMALL_HEADING surface. */
async function checkMonsterInfo(page: Page): Promise<void> {
  await page.evaluate(() => window.A!.openMonsterInfo("budaye"));
  await waitForScene(page, "MonsterInfoScene");
  await page.waitForTimeout(300);
  await screenshot(page, "text-fidelity-monster-info");
}

async function main(): Promise<void> {
  // Combat needs its own fresh boot — spawnBattle stops the OverworldScene
  // and we want monster-info to run with a clean OverworldScene under it.
  {
    const { page, close } = await launchGame();
    try {
      await setupGame(page);
      await checkCombatScene(page);
    } finally {
      await close();
    }
  }

  {
    const { page, close } = await launchGame();
    try {
      await setupGame(page);
      await waitForIdle(page);
      await checkMonsterInfo(page);
    } finally {
      await close();
    }
  }

  console.log("text-fidelity: OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
