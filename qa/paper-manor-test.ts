/**
 * Paper Manor verbatim-port smoke test (STORY-0213).
 *
 * Exercises spyder_paper_manor — Princeton's one-room house:
 *  - front-door entry from spyder_paper_town (10,12) lands at manor (6,7)
 *    facing up, on a 10x8 map whose slug is "manor"
 *  - Princeton is auto-spawned at (1,5) facing right (Create Princeton event)
 *  - talking to Princeton fires the spyder_papermanor_oldman monologue with
 *    no variable gating — re-talking fires the same line
 *  - front-door exit at (6,7) facing down teleports back to paper_town (10,13)
 *  - the two sampled upstream collision rects (2,4) and (7,3) are blocked
 *
 * Upstream is verbatim — there is no flashback, no sub-room, no shop,
 * no music asset (music_cathedral_theme is a console-log stub). Resist
 * the urge to test anything not in upstream's 4-event YAML.
 */
import {
  launchGame,
  setupGame,
  walkTo,
  waitForIdle,
  getState,
  interact,
  screenshot,
} from "./harness";
import type { Page } from "@playwright/test";

interface NpcSnapshot {
  slug: string;
  tileX: number;
  tileY: number;
  facing: string;
}

interface ManorState {
  mapKey?: string;
  player?: { tileX: number; tileY: number; facing: string };
  session?: { variables?: Record<string, string> };
  npcs: NpcSnapshot[];
}

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

/** Press interact until a dialog opens, then return its text. */
async function pressUntilDialog(page: Page, maxSteps = 8): Promise<string> {
  await page.evaluate(() => window.A!.clearEvents?.());
  for (let i = 0; i < maxSteps; i++) {
    await interact(page);
    await page.waitForTimeout(150);
    const events = await page.evaluate(() => [...window.A!.events]);
    const opened = events.find((e) => e.type === "dialog_opened");
    if (opened) return String((opened.data as { text?: string }).text ?? "");
  }
  throw new Error(`No dialog after ${maxSteps} interacts`);
}

/** Press interact a few times to power past any open dialog. */
async function dismissDialogs(page: Page, maxSteps = 8): Promise<void> {
  for (let i = 0; i < maxSteps; i++) {
    await interact(page);
    await page.waitForTimeout(120);
    const events = await page.evaluate(() => [...window.A!.events]);
    // Linear scan from the end — `findLast` isn't in our QA tsconfig's lib.
    let closed = false;
    for (let j = events.length - 1; j >= 0; j--) {
      if (events[j].type === "dialog_closed") {
        closed = true;
        break;
      }
    }
    if (closed) break;
  }
  await waitForIdle(page).catch(() => undefined);
}

/** Poll until the active map matches `mapKey`. */
async function waitForMap(page: Page, mapKey: string, timeoutMs = 7000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const s = (await page.evaluate(() => window.A!.getState())) as ManorState;
    if (s.mapKey === mapKey) return;
    await page.waitForTimeout(120);
  }
  throw new Error(`Timed out waiting for mapKey=${mapKey}`);
}

async function testFrontDoorEntryAndPrinceton(): Promise<void> {
  console.log("[manor entry + princeton spawn] launching...");
  const { page, close } = await launchGame();
  try {
    // Stand one south of the manor door trigger tile in paper_town.
    await setupGame(page, { map: "spyder_paper_town", tileX: 10, tileY: 13 });
    await waitForIdle(page);

    // Step onto (10,12) — the Teleport to Manor trigger. The teleport
    // restarts the scene mid-walkTo; fire-and-forget then poll.
    walkTo(page, 10, 12, "up").catch(() => undefined);
    await waitForMap(page, "spyder_paper_manor");

    const s = (await getState(page)) as ManorState;
    assert(
      s.player?.tileX === 6 && s.player?.tileY === 7,
      `expected to land at manor (6,7), got (${s.player?.tileX},${s.player?.tileY})`,
    );
    assert(s.player?.facing === "up", `expected facing up, got ${s.player?.facing}`);

    // Map slug + dimensions sanity-check (was 9x9 stub with slug paper_manor).
    // Fetch the JSON the running game loaded — the dev server serves it at
    // /assets/maps/, so this is a true byte-level check of what shipped.
    const meta = (await page.evaluate(async () => {
      const r = await fetch("/assets/maps/spyder_paper_manor.json");
      const m = (await r.json()) as {
        width: number;
        height: number;
        properties?: { name: string; value: unknown }[];
        layers: { name: string; type: string }[];
      };
      const slug = m.properties?.find((p) => p.name === "slug")?.value as string | undefined;
      const collisionsLayer = m.layers.find((l) => l.name === "Collisions");
      return {
        width: m.width,
        height: m.height,
        slug,
        layerNames: m.layers.map((l) => l.name),
        hasCollisions: !!collisionsLayer && collisionsLayer.type === "objectgroup",
      };
    })) as {
      width: number;
      height: number;
      slug?: string;
      layerNames: string[];
      hasCollisions: boolean;
    };
    assert(
      meta.width === 10 && meta.height === 8,
      `expected 10x8 map, got ${meta.width}x${meta.height}`,
    );
    assert(meta.slug === "manor", `expected slug "manor", got "${meta.slug}"`);
    assert(
      meta.hasCollisions,
      `expected a Collisions objectgroup layer, got ${meta.layerNames.join(",")}`,
    );
    // Verbatim upstream tile-layer names (note lowercase 'p' in 'Above player').
    for (const want of ["Tile Layer 1", "Tile Layer 2", "Tile Layer 3", "Above player"]) {
      assert(
        meta.layerNames.includes(want),
        `expected layer "${want}", got ${meta.layerNames.join(",")}`,
      );
    }

    await waitForIdle(page);
    const after = (await getState(page)) as ManorState;
    const princeton = after.npcs.find((n) => n.slug === "spyder_papermanor_princeton");
    assert(!!princeton, "expected spyder_papermanor_princeton to spawn on manor entry");
    assert(
      princeton!.tileX === 1 && princeton!.tileY === 5 && princeton!.facing === "right",
      `expected Princeton at (1,5) facing right, got (${princeton!.tileX},${princeton!.tileY}) ${princeton!.facing}`,
    );

    await screenshot(page, "paper-manor-entry");
    console.log("[manor entry + princeton spawn] OK");
  } finally {
    await close();
  }
}

async function testPrincetonDialog(): Promise<void> {
  console.log("[talk princeton] launching...");
  const { page, close } = await launchGame();
  try {
    // Spawn directly facing Princeton from the east. Princeton (created at
    // map-entry by the Create Princeton event) puts a collision body on
    // (1,5), so we stand on (2,5) and face left. Walking there from
    // elsewhere would fail pathfinding because Princeton blocks his own
    // tile, so we just spawn on (2,5) and turn left.
    await setupGame(page, { map: "spyder_paper_manor", tileX: 2, tileY: 5 });
    await waitForIdle(page);
    await page.evaluate(() => window.A!.face?.("left"));
    await waitForIdle(page);

    const text1 = await pressUntilDialog(page);
    // spyder_papermanor_oldman — the "two sons and a niece, sailor, captain"
    // monologue. ~190 chars across two lines.
    assert(
      /two sons|sailor|Archipelago/i.test(text1),
      `expected oldman monologue (sons/sailor/Archipelago), got: ${text1.slice(0, 120)}`,
    );
    await screenshot(page, "paper-manor-princeton-dialog");
    await dismissDialogs(page);

    // Re-talk — upstream has no variable gating, so the exact same line fires.
    await page.evaluate(() => window.A!.face?.("left"));
    await waitForIdle(page);
    const text2 = await pressUntilDialog(page);
    assert(
      text2 === text1,
      `expected identical re-talk dialog (no variable gating); first="${text1.slice(0, 60)}" second="${text2.slice(0, 60)}"`,
    );
    await dismissDialogs(page);

    console.log("[talk princeton] OK");
  } finally {
    await close();
  }
}

async function testFrontDoorExit(): Promise<void> {
  console.log("[manor exit] launching...");
  const { page, close } = await launchGame();
  try {
    // Stand at (6,6) facing down; step onto (6,7) — the Go Outside trigger.
    // The teleport restarts the scene mid-walkTo; fire-and-forget then poll.
    await setupGame(page, { map: "spyder_paper_manor", tileX: 6, tileY: 6 });
    await waitForIdle(page);
    walkTo(page, 6, 7, "down").catch(() => undefined);
    await waitForMap(page, "spyder_paper_town");

    const s = (await getState(page)) as ManorState;
    assert(
      s.player?.tileX === 10 && s.player?.tileY === 13,
      `expected paper_town (10,13), got (${s.player?.tileX},${s.player?.tileY})`,
    );
    assert(s.player?.facing === "down", `expected facing down, got ${s.player?.facing}`);
    await screenshot(page, "paper-manor-exit");
    console.log("[manor exit] OK");
  } finally {
    await close();
  }
}

async function testCollisionSamples(): Promise<void> {
  console.log("[collision sanity] launching...");
  const { page, close } = await launchGame();
  try {
    // Sample two of the 7 upstream YAML collision rects (now in the JSON
    // Collisions objectgroup):
    //   - (2,4) — the 2x2 block in the upper-left quadrant
    //   - (7,3) — the 1x3 vertical bar on the right wall
    await setupGame(page, { map: "spyder_paper_manor", tileX: 3, tileY: 4 });
    await waitForIdle(page);

    // Try to enter (2,4). walkTo bails when no path exists, so we
    // tolerate failure and assert the player did not move into the blocked
    // tile.
    await walkTo(page, 2, 4, "left").catch(() => undefined);
    await waitForIdle(page);
    let s = (await getState(page)) as ManorState;
    assert(
      !(s.player?.tileX === 2 && s.player?.tileY === 4),
      `expected (2,4) blocked, but player is there`,
    );

    // Repark and try (7,3) from (7,4).
    await page.evaluate(() => window.A!.teleport?.("spyder_paper_manor", 7, 4));
    await waitForIdle(page);
    await walkTo(page, 7, 3, "up").catch(() => undefined);
    await waitForIdle(page);
    s = (await getState(page)) as ManorState;
    assert(
      !(s.player?.tileX === 7 && s.player?.tileY === 3),
      `expected (7,3) blocked, but player is there`,
    );

    console.log("[collision sanity] OK");
  } finally {
    await close();
  }
}

async function main(): Promise<void> {
  await testFrontDoorEntryAndPrinceton();
  await testPrincetonDialog();
  await testFrontDoorExit();
  await testCollisionSamples();
  console.log("paper-manor-test: OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
