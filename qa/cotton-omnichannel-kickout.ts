/**
 * Cotton Town Omnichannel HQ kick-out smoke test (STORY-0207).
 *
 * Walks the player into Omnichannel HQ via the south door, watches the
 * enforcer cutscene play out, and asserts the upstream behavior: the player
 * is teleported back to spyder_cotton_town (17,10) — the HQ rejects them on
 * the first visit.
 *
 * Upstream sequence (spyder_omnichannel1.tmx Spot Enforcer + Teleport to
 * Cotton Town events):
 *   1. Enforcer spawns at (8,7), pathfinds to (3,12).
 *   2. Player faces right; enforcer dialog plays.
 *   3. Player faces down, pathfinds to (2,13) — the doormat tile.
 *   4. Enforcer despawns.
 *   5. "Teleport to Cotton Town" trigger (x=1,y=13,w=2) fires unconditionally
 *      on char_at — player lands in cotton_town at (17,10).
 *
 * The kick-out depends on pathfind being able to walk the player onto a
 * directional ("doormat") tile. Before the engine fix the A* grid treated
 * those tiles as unwalkable, so `pathfind player,2,13` returned no path and
 * the player was left stranded inside HQ.
 */
import { launchGame, setupGame, teleport, screenshot, getState, getEvents } from "./harness";
import type { Page } from "@playwright/test";

interface OverworldState {
  scene?: string;
  mapKey?: string;
  player?: { tileX: number; tileY: number; facing: string };
  blocking?: boolean;
  npcs?: { slug: string; tileX: number; tileY: number }[];
  session?: { variables?: Record<string, string> };
}

interface BridgeEvent {
  type: string;
  data: Record<string, unknown>;
}

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

/** Press interact (mash through dialog) until we reach Cotton Town or timeout. */
async function driveCutscene(page: Page, maxTicks = 100): Promise<OverworldState> {
  for (let i = 0; i < maxTicks; i++) {
    const state = (await getState(page)) as OverworldState;
    if (state.mapKey === "spyder_cotton_town") return state;
    if (state.blocking) {
      await page.evaluate(() => window.A!.interact());
    }
    await page.waitForTimeout(100);
  }
  throw new Error(`Cutscene did not return to Cotton Town within ${maxTicks * 100}ms`);
}

async function main() {
  const { page, close } = await launchGame();
  try {
    // Boot post-intro into Cotton Town, then drop straight onto the HQ
    // entry spawn (matches what the cotton_town south-door teleport does).
    // Direct teleport here avoids depending on the cotton_town door event
    // pipeline; the door itself is exercised by paper-town-buildings-test.
    await setupGame(page, { map: "spyder_cotton_town", tileX: 17, tileY: 9 });
    await teleport(page, "spyder_omnichannel1", 2, 12);
    await page.evaluate(() => window.A!.face("up"));

    // Let the scene settle (NPC spawns) before clearing the event log.
    await page.waitForTimeout(300);
    await page.evaluate(() => window.A!.clearEvents());

    // Sanity: we're in HQ at the upstream spawn.
    const before = (await getState(page)) as OverworldState;
    assert(
      before.mapKey === "spyder_omnichannel1",
      `expected to start in spyder_omnichannel1, got ${before.mapKey}`,
    );

    // Drive the cutscene through to the cotton_town landing.
    const after = await driveCutscene(page);
    assert(
      after.mapKey === "spyder_cotton_town",
      `expected to land in spyder_cotton_town, got ${after.mapKey}`,
    );
    assert(
      after.player?.tileX === 17 && after.player?.tileY === 10,
      `expected player at (17,10) after kick-out, got (${after.player?.tileX},${after.player?.tileY})`,
    );

    // Let the fade-in finish before snapping the screenshot so the frame
    // shows the world rather than a black post-teleport flash.
    await page.waitForTimeout(500);
    const shot = await screenshot(page, "cotton-omnichannel-kickout");
    console.log(`[STORY-0207] kicked-out screenshot: ${shot}`);

    // Verify the cutscene actually emitted the expected teleport.
    const events = (await getEvents(page)) as BridgeEvent[];
    const tp = events.find((e) => e.type === "teleport" && e.data.map === "spyder_cotton_town");
    assert(
      !!tp && tp.data.x === 17 && tp.data.y === 10,
      `expected teleport event to spyder_cotton_town (17,10); events=${JSON.stringify(events.map((e) => `${e.type} ${JSON.stringify(e.data)}`))}`,
    );

    // STORY-0215 regression check: the kick-out cutscene must NOT silently
    // flip the hospitalcure quest flag. (Earlier the Spot Enforcer event
    // ran `set_variable hospitalcure:yes` at the end, which both skipped
    // this guard on re-entry and unlocked unrelated downstream content.)
    assert(
      after.session?.variables?.hospitalcure !== "yes",
      `hospitalcure must NOT be "yes" after kick-out; got ${after.session?.variables?.hospitalcure}`,
    );

    console.log("[STORY-0207] kick-out OK");

    // ---------------------------------------------------------------------
    // STORY-0215: second-visit re-encounter. Walking back into HQ before the
    // hospital cure must replay the guard cutscene — upstream gates Spot
    // Enforcer on `not hospitalcure:yes`, which we just confirmed is still
    // unset. Direct-teleport back to (2,12) (same approach as the first
    // visit) and assert we land in cotton_town a second time.
    // ---------------------------------------------------------------------
    await page.evaluate(() => window.A!.clearEvents());
    await teleport(page, "spyder_omnichannel1", 2, 12);
    await page.evaluate(() => window.A!.face("up"));
    await page.waitForTimeout(300);

    const beforeRevisit = (await getState(page)) as OverworldState;
    assert(
      beforeRevisit.mapKey === "spyder_omnichannel1",
      `revisit: expected to start in spyder_omnichannel1, got ${beforeRevisit.mapKey}`,
    );

    // Snap a screenshot once the enforcer has pathfound to his dialog
    // position (3,12) — that's the frame where the upstream `act07`
    // dialog plays, so it's the most legible "guard is back" frame for
    // the reviewer.
    let dialogShot = false;
    for (let i = 0; i < 100; i++) {
      const state = (await getState(page)) as OverworldState;
      const enforcerAtPost = state.npcs?.find(
        (n) =>
          n.slug === "spyder_omnichannel_enforcer" && n.tileX === 3 && n.tileY === 12,
      );
      if (state.blocking && enforcerAtPost && !dialogShot) {
        await screenshot(page, "cotton-omnichannel-kickout-revisit");
        dialogShot = true;
      }
      if (state.mapKey === "spyder_cotton_town") break;
      if (state.blocking) {
        await page.evaluate(() => window.A!.interact());
      }
      await page.waitForTimeout(100);
    }
    assert(dialogShot, "revisit: expected enforcer to reach (3,12) on second visit");

    const afterRevisit = (await getState(page)) as OverworldState;
    assert(
      afterRevisit.mapKey === "spyder_cotton_town",
      `revisit: expected to land in spyder_cotton_town, got ${afterRevisit.mapKey}`,
    );
    assert(
      afterRevisit.session?.variables?.hospitalcure !== "yes",
      `revisit: hospitalcure must still NOT be "yes"; got ${afterRevisit.session?.variables?.hospitalcure}`,
    );

    console.log("[STORY-0215] revisit kick-out OK");
  } finally {
    await close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
