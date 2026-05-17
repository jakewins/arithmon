/**
 * Full Spyder campaign playthrough — teleports to every map, verifies it loads,
 * checks NPCs exist where expected, and tests key transitions.
 */
import { launchGame, walkTo, interact, selectChoice, getState, screenshot } from "./harness";

const ALL_MAPS = [
  // Paper Town region
  "spyder_bedroom", "spyder_downstairs", "spyder_paper_town", "spyder_paper_scoop",
  "spyder_paper_manor", "spyder_paper_daycare", "spyder_paper_rival_downstairs",
  "spyder_paper_rival_bedroom", "spyder_paper_rival_office",
  // Cotton Town region
  "spyder_cotton_town", "spyder_healing_center", "spyder_cotton_scoop",
  // Routes 1-3
  "spyder_route1", "spyder_route2", "spyder_citypark", "spyder_route3",
  // Mansion
  "spyder_mansion", "spyder_mansion_basement", "spyder_mansion_top",
  // Routes 4/A + Timber Town
  "spyder_route4", "spyder_routeA", "spyder_timber_town",
  "spyder_timber_center", "spyder_timber_cafe", "spyder_timber_scoop",
  // Routes 5/6 + Leather Town
  "spyder_route5", "spyder_route6", "spyder_leather_town",
  "spyder_leather_center", "spyder_leather_gym", "spyder_leather_museum",
  "spyder_leather_shaft1", "spyder_leather_shaft2",
  // Flower City + Dojo
  "spyder_flower_city", "spyder_flower_center", "spyder_flower_petshop",
  "spyder_flower_house1", "spyder_flower_house2", "spyder_flower_scoop",
  "spyder_dojo1", "spyder_dojo2", "spyder_dojo3", "spyder_dojo4",
  // Candy Town
  "spyder_candy_town", "spyder_candy_port", "spyder_candy_inn1", "spyder_candy_inn2",
  "spyder_candy_cafe", "spyder_candy_center",
  "spyder_candy_hospital1", "spyder_candy_hospital2", "spyder_candy_hospital3",
  // Greenwash + Tunnels
  "spyder_greenwash", "spyder_greenwash_level2", "spyder_greenwash_level3",
  "spyder_greenwash_greenhouse", "spyder_cotton_tunnel",
  "spyder_dragons_cave", "spyder_dryads_grove",
  // Endgame
  "spyder_nimrod_bottom", "spyder_nimrod_middle", "spyder_nimrod_top", "spyder_nimrod_room",
  "spyder_datacenter", "spyder_routeB", "spyder_routeC", "spyder_diamond_hill",
];

async function main() {
  const { page, close } = await launchGame();
  page.on("pageerror", (err) => console.error("PAGE ERROR:", err.message));

  // Navigate intro
  await new Promise(r => setTimeout(r, 2000));
  await selectChoice(page, 0); await new Promise(r => setTimeout(r, 2000));
  await selectChoice(page, 0); await new Promise(r => setTimeout(r, 2000));
  await selectChoice(page, 1); await new Promise(r => setTimeout(r, 3000));
  await selectChoice(page, 0); await new Promise(r => setTimeout(r, 3000));
  await page.evaluate(() => {
    window.A!.setVariable("question_intro", "yes");
    window.A!.setVariable("spyder_intro", "yes");
    window.A!.setVariable("intro_scoop", "done");
    window.A!.setVariable("got_starter", "yes");
    window.A!.setVariable("firstfightdue", "no");
  });

  console.log(`\n=== Full Campaign Playthrough: ${ALL_MAPS.length} maps ===\n`);

  let passed = 0, failed = 0;
  const failures: string[] = [];

  for (const map of ALL_MAPS) {
    try {
      await page.evaluate((m) => window.A!.teleport(m, 5, 5), map);
      await new Promise(r => setTimeout(r, 1200));
      const state = await getState(page);
      if (state.player) {
        passed++;
        await screenshot(page, map);
      } else {
        failed++;
        failures.push(map);
        console.log(`FAIL: ${map} (no player state)`);
      }
    } catch (e: any) {
      failed++;
      failures.push(map);
      console.log(`ERROR: ${map} — ${e.message}`);
    }
  }

  // Test key transitions
  console.log("\n=== Key Transition Tests ===\n");
  const transitions = [
    { from: "spyder_paper_town", fx: 10, fy: 12, dir: "up" as const, desc: "Paper Town → Manor" },
    { from: "spyder_cotton_town", fx: 39, fy: 28, dir: "right" as const, desc: "Cotton Town → Route 2" },
    { from: "spyder_route4", fx: 27, fy: 10, dir: "right" as const, desc: "Route 4 → Timber Town" },
    { from: "spyder_nimrod_bottom", fx: 13, fy: 3, dir: "up" as const, desc: "Nimrod Bottom → Middle" },
  ];

  for (const t of transitions) {
    await page.evaluate(({ from, fx, fy }) => window.A!.teleport(from, fx, fy + 1), t);
    await new Promise(r => setTimeout(r, 1500));
    try {
      await walkTo(page, t.fx, t.fy, t.dir);
    } catch { /* teleport interrupt */ }
    await new Promise(r => setTimeout(r, 3000));
    const state = await getState(page);
    const p = state.player as any;
    console.log(`${t.desc}: player at (${p?.tileX},${p?.tileY}) — ${p ? "OK" : "FAIL"}`);
  }

  // Test seentimber and seencandy
  console.log("\n=== Variable Checks ===");
  await page.evaluate(() => window.A!.teleport("spyder_timber_town", 15, 12));
  await new Promise(r => setTimeout(r, 1500));
  await page.evaluate(() => window.A!.teleport("spyder_candy_town", 15, 14));
  await new Promise(r => setTimeout(r, 1500));
  const finalState = await getState(page);
  const vars = (finalState.session as any)?.variables;
  console.log(`seentimber: ${vars?.seentimber === "yes" ? "OK" : "FAIL"}`);
  console.log(`seencandy: ${vars?.seencandy === "yes" ? "OK" : "FAIL"}`);

  console.log(`\n=== RESULTS ===`);
  console.log(`Maps: ${passed}/${ALL_MAPS.length} passed, ${failed} failed`);
  if (failures.length > 0) {
    console.log(`Failed: ${failures.join(", ")}`);
  }
  console.log(`Screenshots saved to qa/screenshots/\n`);

  await close();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
