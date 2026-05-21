// STORY-0210: Visual regression QA for the combat-scene layout. We spawn a
// matched-up wild encounter (Pairagrin♂ Lv.3 vs Lambert♂ Lv.8 in upstream's
// reference screenshot — we use the same slugs and levels), capture the
// initial decision frame, then trigger an attack to verify the bottom-band
// dialog message still fits the new 36 px height.
//
// The script is checked in so future style or layout changes have a single
// QA target to re-run against `board/implementing/STORY-0210-*/upstream-target.png`.
import { launchGame, setupGame, screenshot } from "./harness";
import type { Page } from "@playwright/test";

/**
 * Spawn the canonical reference matchup. Mirrors the upstream screenshot's
 * Pairagrin Lv.3 (enemy) vs Lambert Lv.8 (player) in a grass environment.
 * setupGame seeds the post-intro session so the OverworldScene is alive
 * enough to honour spawnBattle, then we tear straight into combat.
 */
async function spawnReferenceBattle(page: Page) {
  await setupGame(page, {});
  await page.evaluate(() => window.A!.spawnBattle("lambert", "pairagrin", 8, 3, "grass"));
  await page.waitForFunction(
    () => {
      const s = window.A!.getState() as { combat?: { menuMode?: string } };
      return s.combat?.menuMode === "main";
    },
    null,
    { timeout: 15_000 },
  );
}

/**
 * Submit a FIGHT → first-technique action via the debug command handler.
 * Bypasses the menu cursor so the script doesn't need to know how many
 * options exist — Lambert's level-8 moveset just needs index 0.
 */
async function pickFirstAttack(page: Page) {
  await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const active: any = (window.A as any).getActiveScene();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const combat: any = active?.scene?.get?.("CombatScene");
    if (!combat) throw new Error("CombatScene not reachable");
    combat.debugSelectChoice(0); // FIGHT
  });
  await page.waitForFunction(
    () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const active: any = (window.A as any).getActiveScene();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const combat: any = active?.scene?.get?.("CombatScene");
      return combat?.getDebugState?.().combat?.menuMode === "techniques";
    },
    null,
    { timeout: 5_000 },
  );
  await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const active: any = (window.A as any).getActiveScene();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const combat: any = active?.scene?.get?.("CombatScene");
    combat.debugSelectChoice(0); // first technique
  });
}

async function main() {
  const { page, close } = await launchGame();
  try {
    await spawnReferenceBattle(page);

    // (1) Decision-state frame — action menu open, prompt visible, both HUDs.
    await screenshot(page, "combat-layout-decision");

    // (2) Hover the FIGHT submenu so the technique popup + info card are
    // both on screen — sanity-check those still fit the new bottom band.
    await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const active: any = (window.A as any).getActiveScene();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const combat: any = active?.scene?.get?.("CombatScene");
      combat.menuMode = "main";
      combat.setMenuMode("techniques");
    });
    await page.waitForTimeout(150);
    await screenshot(page, "combat-layout-techniques");

    // (3) Pick FIGHT → first attack and screenshot the resulting bottom-band
    // message ("Lambert used X!") to verify it fits the 36 px band.
    await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const active: any = (window.A as any).getActiveScene();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const combat: any = active?.scene?.get?.("CombatScene");
      combat.setMenuMode("main");
    });
    await pickFirstAttack(page);
    // Give the event queue a frame to render the first attack message.
    await page.waitForTimeout(250);
    await screenshot(page, "combat-layout-attack-message");

    // (4) Wait through the attack sequence and screenshot the final
    // decision frame again to confirm the layout survives a full round.
    await page.waitForFunction(
      () => {
        const s = window.A!.getState() as { combat?: { menuMode?: string } };
        return s.combat?.menuMode === "main";
      },
      null,
      { timeout: 15_000 },
    );
    await screenshot(page, "combat-layout-post-attack");

    console.log("combat layout QA screenshots written to qa/screenshots/");
  } finally {
    await close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
