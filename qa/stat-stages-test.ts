import { launchGame, setupGame, getState } from "./harness";
import type { Page } from "@playwright/test";

interface CombatEv {
  type: string;
  message: string;
}

interface CombatStateSnapshot {
  combat?: {
    playerMonster?: { currentHp?: number; statStages?: Record<string, number> };
    enemyMonster?: { currentHp?: number; statStages?: Record<string, number> };
  };
}

async function newBattle(page: Page, playerSlug: string, enemySlug: string, level = 15) {
  await page.evaluate(
    async ([p, e, lvl]) => {
      await window.A!.spawnBattle(p as string, e as string, lvl as number, lvl as number);
    },
    [playerSlug, enemySlug, level],
  );
  await page.waitForTimeout(400);
}

async function fight(page: Page, tech: string): Promise<CombatEv[]> {
  const events = await page.evaluate((t) => {
    return window.A!.submitCombatAction({ type: "fight", technique: t });
  }, tech);
  return events as CombatEv[];
}

async function playerHp(page: Page): Promise<number | null> {
  const state = (await getState(page)) as CombatStateSnapshot;
  return state.combat?.playerMonster?.currentHp ?? null;
}

async function teardown(page: Page) {
  await page.evaluate(async () => {
    await window.A!.teleport("spyder_paper_town", 10, 12);
  });
  await page.waitForTimeout(300);
}

async function main() {
  const { page, close } = await launchGame();
  await setupGame(page, {
    map: "spyder_paper_town",
    tileX: 10,
    tileY: 12,
    monsters: [{ slug: "rockitten", level: 15 }],
  });

  let pass = true;
  const failed = (msg: string) => {
    console.error(`FAIL: ${msg}`);
    pass = false;
  };

  // --- Baseline enemy melee damage to player (one growl turn baseline) ---
  // We use growl on our first turn — it's free of damage on the player side and
  // gives the enemy a guaranteed-hit melee attack at full melee.
  // But growl debuffs enemy melee, so on the SECOND turn the enemy hits weaker.
  // To isolate baseline (no debuff), use harden first instead.
  await newBattle(page, "rockitten", "rockitten");
  const hpBefore1 = await playerHp(page);
  await fight(page, "harden"); // affects our armor, not enemy melee — enemy hits us at full melee
  const hpAfter1 = await playerHp(page);
  const baselineEnemyDmg = (hpBefore1 ?? 0) - (hpAfter1 ?? 0);
  console.log(`\nbaseline enemy melee damage (no debuff): ${baselineEnemyDmg}`);
  await teardown(page);

  // --- After growl x2, enemy melee should be at -2 → damage ~halves ---
  await newBattle(page, "rockitten", "rockitten");
  // First growl turn: enemy attacks with full melee (-0). After this turn, enemy melee is -1.
  await fight(page, "growl");
  // Second growl: enemy attacks at -1 melee. After this turn enemy melee is -2.
  await fight(page, "growl");
  // Third turn: enemy attacks at -2 melee. THIS is what we want to measure.
  const hpBefore2 = await playerHp(page);
  await fight(page, "harden"); // doesn't affect enemy; enemy hits us at -2 melee
  const hpAfter2 = await playerHp(page);
  const debuffedEnemyDmg = (hpBefore2 ?? 0) - (hpAfter2 ?? 0);
  console.log(`enemy melee damage after 2x growl: ${debuffedEnemyDmg}`);

  const state = (await getState(page)) as CombatStateSnapshot;
  console.log(`enemy statStages: ${JSON.stringify(state.combat?.enemyMonster?.statStages)}`);

  if (baselineEnemyDmg > 0 && debuffedEnemyDmg > 0) {
    const ratio = debuffedEnemyDmg / baselineEnemyDmg;
    console.log(`ratio: ${ratio.toFixed(2)}x  (expected ~0.5x)`);
    if (ratio > 0.7) failed("growl did not halve enemy melee damage as expected");
  } else {
    failed("could not measure enemy damage");
  }

  await teardown(page);

  // --- Stages reset between battles ---
  await newBattle(page, "rockitten", "rockitten");
  const freshState = (await getState(page)) as CombatStateSnapshot;
  const stages = freshState.combat?.playerMonster?.statStages;
  console.log(`\nfresh battle player statStages: ${JSON.stringify(stages)}`);
  if (!stages || Object.values(stages).some((v) => v !== 0)) {
    failed("stat stages did not reset between battles");
  }
  await teardown(page);

  console.log(pass ? "\nOK ✅" : "\nFAIL ❌");
  await close();
  if (!pass) process.exit(1);
}

main();
