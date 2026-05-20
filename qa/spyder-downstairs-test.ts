/**
 * Smoke test for the spyder_downstairs map port (STORY-0200).
 *
 * Verifies that:
 *   - The Create Homemaker event fires on map entry and spawns the mom NPC.
 *   - Talking to mom shows the spyder_papertown_mom3 dialog (the variant that
 *     fires when the player has a monster and hasn't beaten Zoolander yet —
 *     which is what setupGame leaves us in).
 *   - Stepping onto (4,6) facing down teleports out to spyder_paper_town (10,7).
 *   - The bedroom Go Downstairs event still hands off into this map at (0,2),
 *     keeping the STORY-0195 → STORY-0200 link working.
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
}

interface DownstairsState {
  mapKey: string;
  player: { tileX: number; tileY: number; facing: string };
  npcs: NpcSnapshot[];
}

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

/**
 * Interact repeatedly until the dialog opened by the most recent `dialog_opened`
 * event has been closed. translated_dialog uses a typewriter so the first press
 * usually just completes the page render; we keep going until dialog_closed
 * fires after the dialog_opened we're waiting on.
 */
async function dismissDialog(page: Page): Promise<void> {
  const baseline = (await getEvents(page)).filter((e) => e.type === "dialog_closed").length;
  for (let i = 0; i < 8; i++) {
    await interact(page);
    await page.waitForTimeout(120);
    const closed = (await getEvents(page)).filter((e) => e.type === "dialog_closed").length;
    if (closed > baseline) return;
  }
  throw new Error("dialog never closed after 8 interact presses");
}

async function testMomSpawnsAndTalks(): Promise<void> {
  console.log("[mom spawn + talk] launching...");
  const { page, close } = await launchGame();
  try {
    await setupGame(page, { map: "spyder_downstairs", tileX: 0, tileY: 2 });
    await waitForIdle(page);

    const initial = (await getState(page)) as unknown as DownstairsState;
    const mom = initial.npcs.find((n) => n.slug === "spyder_papertown_mom");
    assert(
      !!mom,
      `expected Create Homemaker to spawn mom at (5,5), got npcs=${JSON.stringify(initial.npcs)}`,
    );
    assert(
      mom!.tileX === 5 && mom!.tileY === 5,
      `expected mom at (5,5), got (${mom!.tileX},${mom!.tileY})`,
    );

    // Walk up to the mom and face her. She's at (5,5); approach from (5,4)
    // facing down so char_facing_char sees the player looking at her.
    await walkTo(page, 5, 4, "down");
    await waitForIdle(page);

    // First interact triggers Talk mom1 (it's the only variant where
    // `not variable_set spokenmom:yes` holds — the variants are mutually
    // exclusive on that flag). mom1 sets spokenmom=yes as a side effect.
    await interact(page);
    const firstOpen = await waitForEvent(page, "dialog_opened");
    assert(
      String(firstOpen.data.text).includes("Good morning sunshine"),
      `expected mom1 dialog, got "${firstOpen.data.text}"`,
    );
    await dismissDialog(page);
    await waitForIdle(page);

    const afterFirst = (await getState(page)) as unknown as DownstairsState & {
      session?: { variables?: Record<string, string> };
    };
    assert(
      afterFirst.session?.variables?.spokenmom === "yes",
      `expected spokenmom=yes after first talk, got ${afterFirst.session?.variables?.spokenmom}`,
    );

    // Second interact: setupGame leaves us with a monster and Zoolander
    // unbeaten, so the Talk mom3 variant fires.
    await interact(page);
    const secondOpen = await waitForEvent(page, "dialog_opened");
    assert(
      String(secondOpen.data.text).includes("found yourself a tuxemon"),
      `expected mom3 dialog, got "${secondOpen.data.text}"`,
    );
    await dismissDialog(page);
    console.log("[mom spawn + talk] OK");
  } finally {
    await close();
  }
}

async function testGoOutsideToPaperTown(): Promise<void> {
  console.log("[go outside] launching...");
  const { page, close } = await launchGame();
  try {
    await setupGame(page, { map: "spyder_downstairs", tileX: 4, tileY: 5 });
    await waitForIdle(page);

    // Step south onto the Go Outside trigger at (4,6). The transition fires
    // mid-step and destroys the page's JS context, so we can't await walkTo —
    // we fire it and watch for the mapKey change via waitForFunction.
    page
      .evaluate(() => window.A!.walkStep("down"))
      .catch(() => {
        /* expected — transition_teleport tears down the scene */
      });

    await page.waitForFunction(
      () => (window.A!.getState() as { mapKey?: string }).mapKey === "spyder_paper_town",
      null,
      { timeout: 5_000 },
    );
    const after = (await getState(page)) as unknown as DownstairsState;
    assert(
      after.mapKey === "spyder_paper_town",
      `expected mapKey=spyder_paper_town, got ${after.mapKey}`,
    );
    assert(
      after.player.tileX === 10 && after.player.tileY === 7,
      `expected player at (10,7) in paper_town, got (${after.player.tileX},${after.player.tileY})`,
    );
    console.log("[go outside] OK");
  } finally {
    await close();
  }
}

async function testBedroomHandoff(): Promise<void> {
  console.log("[bedroom handoff] launching...");
  const { page, close } = await launchGame();
  try {
    // Land near the bedroom's Go Downstairs trigger at (7,2).
    await setupGame(page, { map: "spyder_bedroom", tileX: 7, tileY: 3 });
    await waitForIdle(page);

    page
      .evaluate(() => window.A!.walkStep("up"))
      .catch(() => {
        /* expected — transition_teleport tears down the scene */
      });

    await page.waitForFunction(
      (mapKey) => (window.A!.getState() as { mapKey?: string }).mapKey === mapKey,
      "spyder_downstairs",
      { timeout: 5_000 },
    );
    const after = (await getState(page)) as unknown as DownstairsState;
    assert(
      after.mapKey === "spyder_downstairs",
      `expected mapKey=spyder_downstairs after bedroom handoff, got ${after.mapKey}`,
    );
    assert(
      after.player.tileX === 0 && after.player.tileY === 2,
      `expected player at (0,2) in downstairs, got (${after.player.tileX},${after.player.tileY})`,
    );
    console.log("[bedroom handoff] OK");
  } finally {
    await close();
  }
}

async function main(): Promise<void> {
  await testMomSpawnsAndTalks();
  await testGoOutsideToPaperTown();
  await testBedroomHandoff();
  console.log("spyder-downstairs-test: OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
