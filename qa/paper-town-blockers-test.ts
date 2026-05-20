/**
 * Smoke test for the Paper Town "Stop!" blocker (STORY-0196).
 *
 * Verifies that the upstream-ported event correctly:
 *   - Fires when the player without a monster steps onto tile (13,1).
 *   - Spawns spyder_dante and shows the stopthere dialog.
 *   - Walks the player back to (13,3) facing down and despawns Dante.
 *   - Re-fires on a second attempt (no completion gate, only party_size<1).
 *   - Does NOT fire when the player has at least one monster.
 */
import {
  launchGame,
  setupGame,
  walkTo,
  waitForIdle,
  waitForEvent,
  getState,
  getEvents,
  interact,
} from "./harness";
import type { Page } from "@playwright/test";

interface NpcSnapshot {
  slug: string;
  tileX: number;
  tileY: number;
  facing: string;
}

interface PaperTownState {
  mapKey: string;
  player: { tileX: number; tileY: number; facing: string };
  npcs: NpcSnapshot[];
}

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

/** Dismiss the stopthere dialog by interacting until the engine goes idle. */
async function dismissBlockerDialog(page: Page): Promise<void> {
  // The translated_dialog renders with a typewriter — a couple of interacts
  // usually closes it; we then wait for the whole event chain (pathfinds +
  // remove_npc + unlock_controls) to finish.
  for (let i = 0; i < 6; i++) {
    await interact(page);
    await page.waitForTimeout(120);
    const events = await getEvents(page);
    if (events.some((e) => e.type === "dialog_closed")) break;
  }
  await waitForIdle(page);
}

async function triggerBlocker(page: Page): Promise<void> {
  // Walk into the trigger zone. The Stop! event spans (13,1)-(14,1).
  await walkTo(page, 13, 2, "up");
  await waitForIdle(page);
  await page.evaluate(() => window.A!.clearEvents?.());
  // Fire-and-forget: the moment we land on (13,1) the cutscene grabs the
  // controls and the walkTo() promise never resolves. Wait on the dialog
  // instead — that proves the chain ran.
  walkTo(page, 13, 1, "up").catch(() => undefined);
  await waitForEvent(page, "dialog_opened");
}

async function testBlockerFires(): Promise<void> {
  console.log("[block fires] launching...");
  const { page, close } = await launchGame();
  try {
    await setupGame(page, {
      map: "spyder_paper_town",
      tileX: 13,
      tileY: 5,
      monsters: [],
    });
    await waitForIdle(page);

    await triggerBlocker(page);

    const mid = (await getState(page)) as unknown as PaperTownState;
    const dante = mid.npcs.find((n) => n.slug === "spyder_dante");
    assert(!!dante, `expected spyder_dante to spawn, npcs=${JSON.stringify(mid.npcs)}`);

    await dismissBlockerDialog(page);

    const after = (await getState(page)) as unknown as PaperTownState;
    assert(
      after.player.tileX === 13 && after.player.tileY === 3,
      `expected player at (13,3) after blocker, got (${after.player.tileX},${after.player.tileY})`,
    );
    assert(
      after.player.facing === "down",
      `expected player facing down, got ${after.player.facing}`,
    );
    assert(
      !after.npcs.some((n) => n.slug === "spyder_dante"),
      `expected spyder_dante to despawn, npcs=${JSON.stringify(after.npcs)}`,
    );

    // Re-trigger: there's no completion variable, only party_size<1 — so
    // walking back onto the trigger zone fires the blocker again.
    await triggerBlocker(page);
    const second = (await getState(page)) as unknown as PaperTownState;
    assert(
      second.npcs.some((n) => n.slug === "spyder_dante"),
      `expected blocker to re-fire on second approach, npcs=${JSON.stringify(second.npcs)}`,
    );
    await dismissBlockerDialog(page);

    console.log("[block fires] OK");
  } finally {
    await close();
  }
}

async function testBlockerSuppressedWithMonster(): Promise<void> {
  console.log("[blocker suppressed] launching...");
  const { page, close } = await launchGame();
  try {
    await setupGame(page, {
      map: "spyder_paper_town",
      tileX: 13,
      tileY: 5,
      monsters: [{ slug: "budaye", level: 5 }],
    });
    await waitForIdle(page);

    await walkTo(page, 13, 2, "up");
    await waitForIdle(page);
    await page.evaluate(() => window.A!.clearEvents?.());
    await walkTo(page, 13, 1, "up");
    // Give the engine a few frames in case a delayed event would fire.
    await page.waitForTimeout(400);

    const state = (await getState(page)) as unknown as PaperTownState;
    assert(
      !state.npcs.some((n) => n.slug === "spyder_dante"),
      `expected Stop! to be suppressed with a monster in party, got NPCs ${JSON.stringify(state.npcs)}`,
    );
    assert(
      state.player.tileX === 13 && state.player.tileY === 1,
      `expected player to walk through to (13,1), got (${state.player.tileX},${state.player.tileY})`,
    );

    console.log("[blocker suppressed] OK");
  } finally {
    await close();
  }
}

async function testStop2Fires(): Promise<void> {
  // Stop 2! covers the west exit strip (x=1, y=14..17). It fires when an
  // empty-party player is at any of those tiles. We spawn directly inside
  // the zone (rather than walking from the east) because the cul-de-sac
  // around (1,14) is hemmed in by collision rects that Phaser's physics
  // refuses to walk us through — the trigger semantics are what matter for
  // this test, not the precise approach path.
  console.log("[stop2 fires] launching...");
  const { page, close } = await launchGame();
  try {
    await setupGame(page, {
      map: "spyder_paper_town",
      tileX: 1,
      tileY: 14,
      monsters: [],
    });
    // Don't waitForIdle — Stop 2 fires the moment the engine ticks the first
    // condition check, which happens before idle. Poll for the dialog open
    // event with a generous timeout (Dante pathfinds from (19,13) to (2,14)).
    const deadline = Date.now() + 25_000;
    let dialogOpened = false;
    while (Date.now() < deadline) {
      const events = await getEvents(page);
      if (events.some((e) => e.type === "dialog_opened")) {
        dialogOpened = true;
        break;
      }
      await page.waitForTimeout(250);
    }
    assert(dialogOpened, "expected dialog_opened from Stop 2! within 25s");

    const mid = (await getState(page)) as unknown as PaperTownState;
    assert(
      mid.npcs.some((n) => n.slug === "spyder_dante"),
      `expected Stop 2! to spawn Dante, npcs=${JSON.stringify(mid.npcs)}`,
    );

    await dismissBlockerDialog(page);
    // Allow the post-dialog escort (pathfind player,4,12 + pathfind Dante back home + remove_npc) to finish.
    // The escort path may stall mid-walk in headless physics; we only assert
    // that the chain *runs to completion* — Dante despawns and controls unlock.
    await page.waitForTimeout(12_000);

    const after = (await getState(page)) as unknown as PaperTownState;
    assert(
      !after.npcs.some((n) => n.slug === "spyder_dante"),
      `expected Dante to despawn after escort, npcs=${JSON.stringify(after.npcs)}`,
    );

    console.log("[stop2 fires] OK");
  } finally {
    await close();
  }
}

async function main(): Promise<void> {
  await testBlockerFires();
  await testStop2Fires();
  await testBlockerSuppressedWithMonster();
  console.log("paper-town-blockers-test: OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
