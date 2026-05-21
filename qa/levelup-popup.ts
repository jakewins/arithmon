/**
 * QA: LevelUpPopupScene (STORY-0232) — after a battle in which the player's
 * monster levels up, the post-battle popup must appear with the correct
 * summary, render the six stat rows + OK affordance, and dismiss cleanly
 * back to the overworld on ENTER.
 *
 * Covers two scenarios per the story acceptance criteria:
 *   1. Single-level jump  (L5 → L6, one popup, endLevel=6).
 *   2. Multi-level jump   (L5 → L7, ONE popup with startLevel=5, endLevel=7).
 *
 * Mirrors upstream `LevelUpSummaryState` (one popup per XP grant, no matter
 * how many levels are crossed — see
 * `upstream/tuxemon/monster/monster.py:603-649`).
 *
 * Reviewer comparison target: `qa/screenshots/levelup-popup-single.png`
 * vs `board/.../upstream-levelup-popup.png` — modal layout, header, six
 * alphabetical stat rows, OK affordance.
 */

import { launchGame, setupGame, screenshot, getState } from "./harness";
import type { Page } from "@playwright/test";

interface LevelUpPopupDebug {
  monsterName: string;
  startLevel: number;
  endLevel: number;
}

/** Read the popup's getDebugState contribution from the active scene. */
async function getPopupState(page: Page): Promise<LevelUpPopupDebug | null> {
  const state = (await getState(page)) as { levelUpPopup?: LevelUpPopupDebug };
  return state.levelUpPopup ?? null;
}

/**
 * Wait for the LevelUpPopupScene to become the active scene. Polling the
 * debug-bridge state is simpler than filtering through `scene_started`
 * events (which fires for every scene transition, including MathProblemScene
 * and the popup's own startup).
 */
async function waitForLevelUpPopup(page: Page): Promise<void> {
  await page.waitForFunction(
    () => (window.A!.getState() as { scene?: string }).scene === "LevelUpPopupScene",
    null,
    { timeout: 15_000 },
  );
}

/**
 * Drive a single-shot win for the active player monster against a wild
 * opponent. Pre-seeds XP so the post-faint XP grant tips the player over
 * the requested target level boundary in one shot.
 *
 * Returns once the win message has appeared and the level-up popup has
 * launched (or the test times out — the popup must always appear when a
 * level-up happens on a winning battle).
 */
async function winBattleWithLevelUp(page: Page, targetLevel: number): Promise<void> {
  // Spawn the battle with the player at L5 (the harness default). We then
  // pre-seed totalXp directly so the post-faint awardXp jumps the level by
  // exactly `targetLevel - 5`.
  await page.evaluate(() => window.A!.spawnBattle("budaye", "rockitten", 5, 2, "grass"));
  await page.waitForFunction(
    () => {
      const s = window.A!.getState() as { combat?: { menuMode?: string } };
      return s.combat?.menuMode === "main";
    },
    null,
    { timeout: 15_000 },
  );

  // Pre-seed the COMBAT machine's player monster XP to JUST below the target
  // boundary so the post-faint awardXp grant tips it over. NB: spawnBattle
  // creates a fresh Monster for the battle (independent of session.party[0]),
  // so we have to reach into the live machine — debug.setMonsterXp would
  // mutate session.party[0], the wrong monster.
  // The xpForLevel math is inlined as a cube (medium-fast curve in
  // src/game/combat/formula.ts) — nested arrows inside page.evaluate trigger
  // tsx's `__name` helper which isn't injected into the page context.
  await page.evaluate((target) => {
    const threshold = Math.floor(target * target * target);
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const active: any = (window.A as any).getActiveScene();
    const combat: any = active?.scene?.get?.("CombatScene");
    if (!combat) throw new Error("CombatScene not reachable");
    combat.machine.player.totalXp = threshold - 1;
    /* eslint-enable @typescript-eslint/no-explicit-any */
  }, targetLevel);

  // One-shot the enemy: zero HP, then submit a fight action through the menu
  // path (selectChoice → FIGHT → first technique → confirm). Going through
  // the UI ensures events get pushed onto CombatScene's event queue, which
  // is the path that triggers the popup on END.
  await page.evaluate(() => {
    window.A!.setEnemyHp(0);
  });
  // Submit a fight action via the debug bridge's combat-action helper, but
  // queue the resulting events through the scene so processNextEvent picks
  // up the level_up event (with its attached summary) and showEndMessage
  // launches the popup.
  await page.evaluate(() => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const active: any = (window.A as any).getActiveScene();
    const combat: any = active?.scene?.get?.("CombatScene");
    if (!combat) throw new Error("CombatScene not reachable");
    const tech = combat.machine.player.techniques[0];
    const events = combat.machine.submitAction({ type: "fight", technique: tech.slug });
    // Re-enter the same processing pipeline used by the in-game menu — see
    // CombatScene.queueEvents / processNextEvent. Without this the popup
    // never launches because the END message handler doesn't run.
    combat.queueEvents(events);
    /* eslint-enable @typescript-eslint/no-explicit-any */
  });
}

async function expectPopup(
  page: Page,
  scenario: string,
  expected: LevelUpPopupDebug,
): Promise<void> {
  await waitForLevelUpPopup(page);

  const state = await getPopupState(page);
  if (!state) throw new Error(`[${scenario}] levelUpPopup state missing`);
  if (state.monsterName !== expected.monsterName) {
    throw new Error(
      `[${scenario}] monsterName=${state.monsterName} expected=${expected.monsterName}`,
    );
  }
  if (state.startLevel !== expected.startLevel) {
    throw new Error(`[${scenario}] startLevel=${state.startLevel} expected=${expected.startLevel}`);
  }
  if (state.endLevel !== expected.endLevel) {
    throw new Error(`[${scenario}] endLevel=${state.endLevel} expected=${expected.endLevel}`);
  }
}

async function dismissPopup(page: Page): Promise<void> {
  // Press ENTER on the document. Phaser's keyboard plugin listens on document.
  await page.evaluate(() => {
    document.dispatchEvent(new KeyboardEvent("keydown", { keyCode: 13, bubbles: true }));
  });
  await new Promise((r) => setTimeout(r, 100));
  await page.evaluate(() => {
    document.dispatchEvent(new KeyboardEvent("keyup", { keyCode: 13, bubbles: true }));
  });

  // Wait for the popup to actually shut down and CombatScene to tear down
  // back to OverworldScene.
  await page.waitForFunction(
    () => (window.A!.getState() as { scene?: string }).scene === "OverworldScene",
    null,
    { timeout: 10_000 },
  );
}

async function main() {
  const { page, close } = await launchGame();
  try {
    // --- Scenario 1: single-level jump L5 → L6 ---
    await setupGame(page);
    await winBattleWithLevelUp(page, 6);
    await expectPopup(page, "single", {
      monsterName: "Budaye",
      startLevel: 5,
      endLevel: 6,
    });
    await screenshot(page, "levelup-popup-single");
    console.log("scenario 1 OK — single-level popup");
    await dismissPopup(page);
    console.log("scenario 1 dismissed cleanly back to overworld");

    // --- Scenario 2: multi-level jump L5 → L7 in ONE popup ---
    // Wipe the party first so setupGame's seed doesn't add a SECOND budaye
    // next to the leveled-up one from scenario 1 (CombatScene reads the
    // lead monster off party[0]).
    await page.evaluate(() => window.A!.clearParty());
    await setupGame(page);
    await winBattleWithLevelUp(page, 7);
    await expectPopup(page, "multi", {
      monsterName: "Budaye",
      startLevel: 5,
      endLevel: 7,
    });
    await screenshot(page, "levelup-popup-multi");
    console.log("scenario 2 OK — multi-level (L5→L7) popup collapses to ONE card");
    await dismissPopup(page);
    console.log("scenario 2 dismissed cleanly back to overworld");

    console.log("OK");
  } finally {
    await close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
