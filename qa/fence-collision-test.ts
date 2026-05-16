/**
 * QA test: verify directional tile collision (fences).
 *
 * Uses the test_collision map with a single fence tile at (5, 5)
 * having enter_from: ["down"], exit_from: ["down"].
 *
 * Run:  npm run dev  (in another terminal)
 *       PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=$(which chromium) npx tsx qa/fence-collision-test.ts
 */
import { launchGame, getState, interact, teleport, screenshot } from "./harness";
import type { Page } from "@playwright/test";

interface PlayerPos {
  tileX: number;
  tileY: number;
  pixelX: number;
  pixelY: number;
}

function player(state: Record<string, unknown>): PlayerPos {
  return state.player as PlayerPos;
}

/** Dismiss intro cutscene and get to OverworldScene. */
async function dismissIntro(page: Page) {
  await page.evaluate(() => {
    window.A!.setVariable("intro_scoop", "done");
    window.A!.setVariable("got_starter", "yes");
    window.A!.setVariable("firstfightdue", "no");
  });
  for (let i = 0; i < 20; i++) {
    await interact(page);
    await new Promise((r) => setTimeout(r, 150));
    const state = await getState(page);
    if ((state as any).scene === "OverworldScene") return;
  }
  throw new Error("Could not dismiss intro cutscene");
}

/** Hold an arrow key for `ms` milliseconds, then release and settle. */
async function holdKey(page: Page, key: string, ms: number) {
  await page.keyboard.down(key);
  await new Promise((r) => setTimeout(r, ms));
  await page.keyboard.up(key);
  await new Promise((r) => setTimeout(r, 200));
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

async function main() {
  const { page, close } = await launchGame();
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));

  try {
    await dismissIntro(page);

    // --- Test 1: approach fence from NORTH (blocked) ---
    console.log("Test 1: Approach fence from north...");
    await teleport(page, "test_collision", 5, 3);
    let p = player(await getState(page));
    console.log(`  Start: (${p.tileX},${p.tileY}) px=(${p.pixelX},${p.pixelY})`);

    await holdKey(page, "ArrowDown", 500);
    p = player(await getState(page));
    console.log(`  Result: (${p.tileX},${p.tileY}) px=(${p.pixelX},${p.pixelY})`);
    assert(p.tileX === 5 && p.tileY === 4, `expected (5,4), got (${p.tileX},${p.tileY})`);
    assert(Math.abs(p.pixelY - 64) < 3, `pixelY should be ~64, got ${p.pixelY}`);
    console.log("  PASS: blocked at tile center (5,4)");

    // --- Test 2: approach fence from SOUTH (allowed) ---
    console.log("\nTest 2: Approach fence from south...");
    await teleport(page, "test_collision", 5, 7);
    await holdKey(page, "ArrowUp", 700);
    p = player(await getState(page));
    console.log(`  Result: (${p.tileX},${p.tileY}) px=(${p.pixelX},${p.pixelY})`);
    assert(p.tileX === 5 && p.tileY === 5, `expected (5,5), got (${p.tileX},${p.tileY})`);
    console.log("  PASS: entered fence tile (5,5) from south");

    // --- Test 3: approach from WEST (blocked) ---
    console.log("\nTest 3: Approach fence from west...");
    await teleport(page, "test_collision", 3, 5);
    await holdKey(page, "ArrowRight", 500);
    p = player(await getState(page));
    console.log(`  Result: (${p.tileX},${p.tileY}) px=(${p.pixelX},${p.pixelY})`);
    assert(p.tileX === 4 && p.tileY === 5, `expected (4,5), got (${p.tileX},${p.tileY})`);
    console.log("  PASS: blocked at (4,5)");

    // --- Test 4: approach from EAST (blocked) ---
    console.log("\nTest 4: Approach fence from east...");
    await teleport(page, "test_collision", 7, 5);
    await holdKey(page, "ArrowLeft", 500);
    p = player(await getState(page));
    console.log(`  Result: (${p.tileX},${p.tileY}) px=(${p.pixelX},${p.pixelY})`);
    assert(p.tileX === 6 && p.tileY === 5, `expected (6,5), got (${p.tileX},${p.tileY})`);
    console.log("  PASS: blocked at (6,5)");

    // --- Test 5: exit fence southward ---
    console.log("\nTest 5: Exit fence southward...");
    await teleport(page, "test_collision", 5, 5);
    await holdKey(page, "ArrowDown", 250);
    p = player(await getState(page));
    console.log(`  Result: (${p.tileX},${p.tileY}) px=(${p.pixelX},${p.pixelY})`);
    assert(p.tileX === 5 && p.tileY >= 6, `expected (5,6+), got (${p.tileX},${p.tileY})`);
    console.log("  PASS: exited southward");

    // --- Test 6: walk away from fence after being blocked ---
    console.log("\nTest 6: Walk away from fence (north) after being blocked...");
    await teleport(page, "test_collision", 5, 3);
    await holdKey(page, "ArrowDown", 500); // walk down to fence, stop at (5,4)
    p = player(await getState(page));
    console.log(`  At fence: (${p.tileX},${p.tileY}) px=(${p.pixelX},${p.pixelY})`);
    assert(p.tileY === 4, `should be at tile 4, got ${p.tileY}`);
    // Now walk AWAY (north) — should NOT be stuck
    await holdKey(page, "ArrowUp", 300);
    p = player(await getState(page));
    console.log(`  After walking away: (${p.tileX},${p.tileY}) px=(${p.pixelX},${p.pixelY})`);
    assert(p.tileY < 4, `should have moved north from 4, got ${p.tileY}`);
    console.log("  PASS: walked away from fence");

    await screenshot(page, "fence-test-all-pass");
    console.log("\nAll fence collision tests PASSED!");
  } finally {
    await close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
