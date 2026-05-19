import { launchGame, setupGame, getState } from "./harness";
import type { Page } from "@playwright/test";

interface CombatEv {
  type: string;
  message: string;
}

async function attack(
  page: Page,
  playerSlug: string,
  enemySlug: string,
  technique: string,
): Promise<CombatEv[]> {
  await page.evaluate(
    async ([p, e]) => {
      await window.A!.spawnBattle(p, e, 20, 20);
    },
    [playerSlug, enemySlug],
  );
  await page.waitForTimeout(400);
  const events = await page.evaluate((t) => {
    return window.A!.submitCombatAction({ type: "fight", technique: t });
  }, technique);
  return events as CombatEv[];
}

async function teardown(page: Page) {
  await page.evaluate(async () => {
    await window.A!.teleport("spyder_paper_town", 10, 12);
  });
  await page.waitForTimeout(300);
}

const parseDamage = (events: CombatEv[]): number | null => {
  const dmg = events.find((e) => e.type === "damage");
  const m = dmg && /took (\d+) damage/.exec(dmg.message);
  return m ? Number(m[1]) : null;
};
const effMsg = (events: CombatEv[]): string | null =>
  events.find((e) => e.type === "effectiveness")?.message ?? null;

async function main() {
  const { page, close } = await launchGame();
  await setupGame(page, {
    map: "spyder_paper_town",
    tileX: 10,
    tileY: 12,
    monsters: [{ slug: "ignibus", level: 5 }],
  });

  let pass = true;
  const failed = (msg: string) => {
    console.error(`FAIL: ${msg}`);
    pass = false;
  };

  // --- Element effectiveness (STORY-0066): fire→wood (2x) vs fire→earth (0.5x) ---
  const vsWood = await attack(page, "ignibus", "budaye", "ember");
  await teardown(page);
  const vsEarth = await attack(page, "ignibus", "grintot", "ember");
  await teardown(page);

  const woodDmg = parseDamage(vsWood);
  const earthDmg = parseDamage(vsEarth);
  console.log(`\nember (fire) → budaye (wood): ${woodDmg} dmg  (${effMsg(vsWood)})`);
  console.log(`ember (fire) → grintot (earth): ${earthDmg} dmg  (${effMsg(vsEarth)})`);

  if (woodDmg === null || earthDmg === null) {
    failed("missing damage event for element test");
  } else {
    const ratio = woodDmg / earthDmg;
    console.log(`  effectiveness ratio: ${ratio.toFixed(2)}x  (expected ~4x)`);
    if (ratio < 3 || ratio > 5) failed(`ratio ${ratio} not in [3, 5]`);
  }
  if (effMsg(vsWood) !== "It's super effective!")
    failed(`expected "super effective", got: ${effMsg(vsWood)}`);
  if (effMsg(vsEarth) !== "It's not very effective…")
    failed(`expected "not very effective", got: ${effMsg(vsEarth)}`);

  // --- Melee vs ranged split (STORY-0067) ---
  // grintot (brute) has high armor and low dodge — a ranged attack should
  // out-damage a melee attack of comparable power. Use ignibus (polliwog,
  // ranged-heavy) so its ranged stat is high.
  // We compare two same-element attackers to isolate the range pivot:
  //   - bodySlam: melee, power 1.6, normal vs earth = 1x
  //   - psybeam:  ranged, power 1.8, cosmic vs earth = 1x
  // psybeam should out-damage bodySlam against grintot when launched by a
  // ranged-statted attacker, because dodge < armor for brute.
  const meleeAttack = await attack(page, "ignibus", "grintot", "bodySlam");
  await teardown(page);
  const rangedAttack = await attack(page, "ignibus", "grintot", "psybeam");
  await teardown(page);

  const meleeDmg = parseDamage(meleeAttack);
  const rangedDmg = parseDamage(rangedAttack);
  console.log(`\nbodySlam (melee, normal) → grintot: ${meleeDmg} dmg`);
  console.log(`psybeam (ranged, cosmic) → grintot: ${rangedDmg} dmg`);
  if (meleeDmg === null || rangedDmg === null) {
    failed("missing damage event for range test");
  } else if (rangedDmg <= meleeDmg) {
    failed(`ranged (${rangedDmg}) should beat melee (${meleeDmg}) vs high-armor grintot`);
  }

  // --- Verify getState exposes all six stats on the party lead ---
  const state = (await getState(page)) as {
    session?: { monsters?: { stats?: Record<string, number> }[] };
  };
  const lead = state.session?.monsters?.[0]?.stats;
  console.log(`\nparty lead stats: ${JSON.stringify(lead)}`);
  if (!lead) {
    failed("no party lead stats in getState()");
  } else {
    for (const k of ["hp", "melee", "ranged", "armor", "dodge", "speed"]) {
      if (typeof lead[k] !== "number") failed(`missing/non-numeric stats.${k}`);
    }
  }

  console.log(pass ? "\nOK ✅" : "\nFAIL ❌");
  await close();
  if (!pass) process.exit(1);
}

main();
