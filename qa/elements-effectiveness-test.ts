import { launchGame, setupGame } from "./harness";
import type { Page } from "@playwright/test";

interface CombatEv {
  type: string;
  message: string;
}

async function fireEmberAt(page: Page, enemySlug: string): Promise<CombatEv[]> {
  // Spawn a fresh ignibus-vs-target battle then submit an ember attack.
  await page.evaluate(async (enemy) => {
    await window.A!.spawnBattle("ignibus", enemy, 20, 20);
  }, enemySlug);
  // Let CombatScene boot.
  await page.waitForTimeout(400);
  // Drain the INTRO state.
  await page.evaluate(() => {
    // Submitting "fight" from INTRO is a no-op; submit from DECISION instead.
    // The scene's intro() is called automatically; ensure we're in DECISION.
  });
  // Submit ember
  const events = await page.evaluate(() => {
    return window.A!.submitCombatAction({ type: "fight", technique: "ember" });
  });
  return events as CombatEv[];
}

async function endBattle(page: Page) {
  // Run from combat and tear it down.
  await page.evaluate(() => {
    const A = window.A!;
    // Force-end: keep submitting "run" until END, or directly stop scene via teleport.
    void A;
  });
  // Teleport back to overworld to fully tear down CombatScene.
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
    monsters: [{ slug: "ignibus", level: 5 }],
  });

  const vsWood = await fireEmberAt(page, "budaye");
  console.log("\nember -> budaye (wood):");
  for (const e of vsWood) console.log(`  [${e.type}] ${e.message}`);

  await endBattle(page);

  const vsEarth = await fireEmberAt(page, "grintot");
  console.log("\nember -> grintot (earth):");
  for (const e of vsEarth) console.log(`  [${e.type}] ${e.message}`);

  const parseDamage = (events: CombatEv[]) => {
    const dmg = events.find((e) => e.type === "damage");
    const m = dmg && /took (\d+) damage/.exec(dmg.message);
    return m ? Number(m[1]) : null;
  };
  const woodDmg = parseDamage(vsWood);
  const earthDmg = parseDamage(vsEarth);
  const woodEff = vsWood.find((e) => e.type === "effectiveness")?.message ?? null;
  const earthEff = vsEarth.find((e) => e.type === "effectiveness")?.message ?? null;

  console.log("\nResults:");
  console.log(`  fire→wood: ${woodDmg} dmg  (${woodEff})`);
  console.log(`  fire→earth: ${earthDmg} dmg  (${earthEff})`);

  let pass = true;
  if (woodDmg === null || earthDmg === null) {
    console.error("FAIL: missing damage event");
    pass = false;
  } else {
    const ratio = woodDmg / earthDmg;
    console.log(`  ratio: ${ratio.toFixed(2)}x  (expected ~4x)`);
    if (ratio < 3 || ratio > 5) {
      console.error(`FAIL: ratio ${ratio} not in [3, 5]`);
      pass = false;
    }
  }
  if (woodEff !== "It's super effective!") {
    console.error(`FAIL: expected "super effective", got: ${woodEff}`);
    pass = false;
  }
  if (earthEff !== "It's not very effective…") {
    console.error(`FAIL: expected "not very effective", got: ${earthEff}`);
    pass = false;
  }

  console.log(pass ? "\nOK ✅" : "\nFAIL ❌");
  await close();
  if (!pass) process.exit(1);
}

main();
