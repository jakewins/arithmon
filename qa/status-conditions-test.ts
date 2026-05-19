import { launchGame, setupGame, getState } from "./harness";
import type { Page } from "@playwright/test";

interface CombatEv {
  type: string;
  message: string;
}

interface CombatStateSnapshot {
  combat?: {
    enemyMonster?: { status?: { slug: string; turnsRemaining: number }[] };
    playerMonster?: { status?: { slug: string; turnsRemaining: number }[] };
  };
}

async function fight(page: Page, tech: string): Promise<CombatEv[]> {
  const events = await page.evaluate((t) => {
    return window.A!.submitCombatAction({ type: "fight", technique: t });
  }, tech);
  return events as CombatEv[];
}

async function newBattle(page: Page, playerSlug: string, enemySlug: string) {
  await page.evaluate(
    async ([p, e]) => {
      await window.A!.spawnBattle(p, e, 20, 20);
    },
    [playerSlug, enemySlug],
  );
  await page.waitForTimeout(400);
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
    monsters: [{ slug: "budaye", level: 10 }],
  });

  let pass = true;
  const failed = (msg: string) => {
    console.error(`FAIL: ${msg}`);
    pass = false;
  };

  // Force every applyStatus to succeed so the QA is deterministic.
  await page.evaluate(() => {
    window.A!.setForceStatusApply(true);
  });

  // --- Poison: budaye stings ignibus, then ignibus takes tick damage ---
  await newBattle(page, "budaye", "ignibus");
  const poisonEvents = await fight(page, "poisonSting");
  console.log("\npoisonSting → ignibus events:");
  for (const e of poisonEvents) console.log(`  [${e.type}] ${e.message}`);

  const applyEv = poisonEvents.find((e) => e.type === "status_apply");
  if (!applyEv) failed("expected a status_apply event for poison");
  if (applyEv && !/poisoned/i.test(applyEv.message)) failed(`apply msg: ${applyEv.message}`);

  const state = (await getState(page)) as CombatStateSnapshot;
  const enemyStatus = state.combat?.enemyMonster?.status ?? [];
  console.log(`enemy status: ${JSON.stringify(enemyStatus)}`);
  if (!enemyStatus.some((s) => s.slug === "poisoned")) {
    failed("expected ignibus to be poisoned in getState()");
  }

  // The first action ran poisonSting's damage + apply + enemy turn + EOT tick.
  // Tick damage should have shown up in the event log already.
  const tickEv = poisonEvents.find((e) => e.type === "status_tick");
  if (!tickEv) failed("expected a status_tick event after end of turn");
  if (tickEv && !/poison damage/i.test(tickEv.message)) failed(`tick msg: ${tickEv.message}`);

  await teardown(page);

  // --- Sleep: lullaby on ignibus, then verify ignibus skips its next turn ---
  await newBattle(page, "budaye", "ignibus");
  const sleepEvents = await fight(page, "lullaby");
  console.log("\nlullaby → ignibus events:");
  for (const e of sleepEvents) console.log(`  [${e.type}] ${e.message}`);

  const sleepApply = sleepEvents.find((e) => e.type === "status_apply");
  if (!sleepApply) failed("expected sleep apply event");
  // Submit another turn — the gating should fire and ignibus should NOT attack.
  const gatedTurn = await fight(page, "scratch");
  console.log("\nscratch (sleep gate turn) events:");
  for (const e of gatedTurn) console.log(`  [${e.type}] ${e.message}`);

  const gatedEv = gatedTurn.find((e) => e.type === "status_gated");
  if (!gatedEv) failed("expected enemy turn to be gated by sleep");
  const enemyAttacked = gatedTurn.some((e) => e.type === "enemy_attack");
  if (enemyAttacked) failed("ignibus shouldn't attack while asleep");

  await teardown(page);

  console.log(pass ? "\nOK ✅" : "\nFAIL ❌");
  await close();
  if (!pass) process.exit(1);
}

main();
