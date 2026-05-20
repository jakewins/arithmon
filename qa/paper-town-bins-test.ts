/**
 * Paper Town starter-pick + first-battle smoke test (STORY-0196).
 *
 * Covers the upstream `My First Mon - Not Met` blocker, the per-bin journal
 * dialog, the `Chosen - X` auto-fire that adds the picked monster to the
 * party, and the `First Fight - Start` cutscene against Billie. Each phase
 * runs in its own fresh launch so a flake in (say) the bin interaction
 * doesn't poison the first-fight trigger downstream.
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
  selectChoice,
} from "./harness";
import type { Page } from "@playwright/test";

interface NpcSnapshot {
  slug: string;
  tileX: number;
  tileY: number;
  facing: string;
}

interface PaperTownState {
  scene?: string | null;
  mapKey: string;
  player: { tileX: number; tileY: number; facing: string };
  npcs: NpcSnapshot[];
  session?: {
    variables?: Record<string, string>;
    monsters?: { slug: string; level: number }[];
    inventory?: { slug: string; count: number }[];
  };
}

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

/**
 * Poll the event buffer for the Nth occurrence of `type` (1-indexed). Unlike
 * `waitForEvent` (which only triggers on *future* events) this counts events
 * already in the buffer, so we don't race with cutscene actions that fire
 * between async test steps.
 */
async function waitForNthEvent(
  page: Page,
  type: string,
  n: number,
  timeoutMs: number,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const events = await getEvents(page);
    if (events.filter((e) => e.type === type).length >= n) return;
    await page.waitForTimeout(120);
  }
  const events = await getEvents(page);
  throw new Error(
    `waitForNthEvent("${type}", ${n}) timed out; buffer=${JSON.stringify(events.map((e) => e.type))}`,
  );
}

/**
 * Dismiss the currently-open dialog by pressing interact until the buffer
 * gains an *additional* `dialog_closed` event past whatever was already
 * there. Returns without clearing the buffer — leaving subsequent events
 * intact for the caller's `waitForNthEvent` polls.
 */
async function dismissDialog(page: Page, maxPresses = 8): Promise<void> {
  const baseline = (await getEvents(page)).filter((e) => e.type === "dialog_closed").length;
  for (let i = 0; i < maxPresses; i++) {
    await interact(page);
    await page.waitForTimeout(120);
    const events = await getEvents(page);
    const count = events.filter((e) => e.type === "dialog_closed").length;
    if (count > baseline) {
      return;
    }
  }
}

/** Read a single game variable via the debug state. */
async function getVar(page: Page, key: string): Promise<string | undefined> {
  const state = (await getState(page)) as unknown as PaperTownState;
  return state.session?.variables?.[key];
}

/** Test 1: walking the south strip with no party fires My First Mon - Not Met. */
async function testMyFirstMonNotMet(): Promise<void> {
  console.log("[my-first-mon] launching...");
  const { page, close } = await launchGame();
  try {
    await setupGame(page, {
      map: "spyder_paper_town",
      tileX: 13,
      tileY: 5,
      monsters: [],
      // Clear the dantefirst/dantebin gates so the "Not Met" variant fires
      // (rather than the post-met "My First Mon" variant which gates on
      // dantefirst:yes + dantebin not set).
      variables: { dantefirst: null, dantebin: null },
    });
    await waitForIdle(page);
    await page.evaluate(() => window.A!.clearEvents?.());

    // Walk south to the trigger strip (23..31, y=13). Approach from the west.
    // The walkTo promise won't resolve once the cutscene grabs controls.
    walkTo(page, 23, 13, "down").catch(() => undefined);
    await waitForEvent(page, "dialog_opened");

    const mid = (await getState(page)) as unknown as PaperTownState;
    assert(
      mid.npcs.some((n) => n.slug === "spyder_dante"),
      `expected spyder_dante to spawn, npcs=${JSON.stringify(mid.npcs)}`,
    );

    // The cutscene runs three back-to-back dialogs (notmet, myfirstmon1,
    // wait 1s, myfirstmon2). Dismiss them all, then let the engine finish.
    for (let i = 0; i < 4; i++) {
      await dismissDialog(page, 10);
      await page.waitForTimeout(400);
    }
    // Allow the post-dialog pathfind back home + remove_npc to settle.
    await page.waitForTimeout(8000);

    const dantefirst = await getVar(page, "dantefirst");
    const dantebin = await getVar(page, "dantebin");
    assert(
      dantefirst === "yes",
      `expected dantefirst:yes after cutscene, got ${JSON.stringify(dantefirst)}`,
    );
    assert(
      dantebin === "yes",
      `expected dantebin:yes after cutscene, got ${JSON.stringify(dantebin)}`,
    );

    console.log("[my-first-mon] OK");
  } finally {
    await close();
  }
}

/** Test 2: the Rockitten bin shows journal, asks yes/no, sets rockittenchosen. */
async function testBinPickRockitten(): Promise<void> {
  console.log("[bin-pick] launching...");
  const { page, close } = await launchGame();
  try {
    await setupGame(page, {
      map: "spyder_paper_town",
      tileX: 22,
      tileY: 11, // Two tiles below the Rockitten bin at (22, 9–10).
      monsters: [],
      // Skip the Dante cutscene so the bin gate (`is party_size <1`) is the
      // only thing left between us and the interaction.
      variables: { dantefirst: "yes", dantebin: "yes" },
    });
    await waitForIdle(page);
    await page.evaluate(() => window.A!.clearEvents?.());

    // Walk one tile north — leaves the player at (22, 10) facing up, directly
    // below the bin tile (22, 9). Then INTERACT to talk to the bin.
    await page.evaluate(() => window.A!.walkStep("up"));
    await waitForIdle(page);
    await interact(page);

    // First dialog: "There is..." (spyder_papertown_thereis). Dismiss it.
    await waitForNthEvent(page, "dialog_opened", 1, 4000);
    await dismissDialog(page, 8);

    // open_journal launches MonsterInfoScene — confirm it comes up.
    await page.waitForFunction(
      () => (window.A!.getState() as { scene?: string }).scene === "MonsterInfoScene",
      null,
      { timeout: 5000 },
    );

    // Press B (keyCode 66) to close MonsterInfoScene.
    await page.evaluate(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { keyCode: 66, bubbles: true }));
    });
    await page.waitForTimeout(120);
    await page.evaluate(() => {
      document.dispatchEvent(new KeyboardEvent("keyup", { keyCode: 66, bubbles: true }));
    });
    await page.waitForFunction(
      () => (window.A!.getState() as { scene?: string }).scene === "OverworldScene",
      null,
      { timeout: 5000 },
    );

    // Second dialog: spyder_papertown_rockitten — count is now 2.
    await waitForNthEvent(page, "dialog_opened", 2, 5000);
    await dismissDialog(page, 8);

    // Yes/no choice. Pick "yes" → sets rockittenchosen:yes.
    await waitForNthEvent(page, "choice_presented", 1, 5000);
    await selectChoice(page, 0);
    await page.waitForTimeout(300);

    const chosen = await getVar(page, "rockittenchosen");
    assert(
      chosen === "yes",
      `expected rockittenchosen:yes after picking yes, got ${JSON.stringify(chosen)}`,
    );

    // The Chosen - Rockitten auto-fire (cond: rockittenchosen:yes + party<1)
    // adds the monster, sets firstfightdue:yes, mymonchoice:rockitten. It
    // also renders a translated_dialog banner with the monster's name —
    // dismiss any pending dialog before re-checking state.
    await page.waitForTimeout(800);
    await dismissDialog(page, 8);
    await page.waitForTimeout(400);

    const due = await getVar(page, "firstfightdue");
    const choice = await getVar(page, "mymonchoice");
    assert(due === "yes", `expected firstfightdue:yes, got ${JSON.stringify(due)}`);
    assert(
      choice === "rockitten",
      `expected mymonchoice:rockitten, got ${JSON.stringify(choice)}`,
    );

    const state = (await getState(page)) as unknown as PaperTownState;
    const party = state.session?.monsters ?? [];
    assert(
      party.some((m) => m.slug === "rockitten" && m.level === 5),
      `expected party to contain rockitten L5, got ${JSON.stringify(party)}`,
    );

    console.log("[bin-pick] OK");
  } finally {
    await close();
  }
}

/** Test 3: first-fight start spawns Billie, gives the scroll, launches combat. */
async function testFirstFightStart(): Promise<void> {
  console.log("[first-fight] launching...");
  const { page, close } = await launchGame();
  try {
    await setupGame(page, {
      map: "spyder_paper_town",
      tileX: 25,
      tileY: 9,
      // Party of one — billie_choice (= "rockitten") is what Billie will be
      // given via the multi-arg add_monster form.
      monsters: [{ slug: "rockitten", level: 5 }],
      variables: {
        firstfightdue: "yes",
        dantefirst: "yes",
        dantebin: "yes",
        mymonchoice: "rockitten",
        billie_choice: "rockitten",
      },
    });
    // Don't waitForIdle — the First Fight - Start event has no positional
    // gate (only `is variable_set firstfightdue:yes`), so it auto-fires the
    // moment the map loads and drives a multi-step cutscene that never goes
    // idle until combat launches. Poll for the firstfight dialog instead.

    const deadline = Date.now() + 25_000;
    let opened = false;
    while (Date.now() < deadline) {
      const events = await getEvents(page);
      if (events.some((e) => e.type === "dialog_opened")) {
        opened = true;
        break;
      }
      await page.waitForTimeout(250);
    }
    assert(opened, "expected spyder_papertown_firstfight dialog within 25s");

    // Verify Billie is present and the scroll was added to inventory.
    const mid = (await getState(page)) as unknown as PaperTownState;
    assert(
      mid.npcs.some((n) => n.slug === "spyder_billie"),
      `expected spyder_billie to spawn, npcs=${JSON.stringify(mid.npcs)}`,
    );
    const inv = mid.session?.inventory ?? [];
    assert(
      inv.some((it) => it.slug === "friendship_scroll" && it.count >= 1),
      `expected friendship_scroll in inventory, got ${JSON.stringify(inv)}`,
    );

    console.log("[first-fight] OK (Billie spawned, scroll granted, dialog reached)");
  } finally {
    await close();
  }
}

async function main(): Promise<void> {
  await testMyFirstMonNotMet();
  await testBinPickRockitten();
  await testFirstFightStart();
  console.log("paper-town-bins-test: OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
