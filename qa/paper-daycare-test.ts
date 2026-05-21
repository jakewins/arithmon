/**
 * Paper Daycare verbatim-port smoke test (STORY-0212).
 *
 * Exercises spyder_paper_daycare end-to-end:
 *  - front + back door entries from spyder_paper_town land at the right tiles
 *  - all three Granny Piper dialog branches fire under the right variable
 *    conditions (pre-Timber greeting + repeat, post-Timber introduce-daycare,
 *    no-monster, has-monster which also invokes the stubbed `daycare` action)
 *  - both Pamphlet variants fire (gated on `seentimber`)
 *  - exits teleport back to the correct town tiles
 *  - the Billie/Grandma flashback cutscene runs to completion when
 *    force-triggered with `billie_grandma:yes` and ends with the player
 *    teleported to spyder_paper_rival_downstairs.tmx,7,9
 *
 * The `daycare` engine action is stubbed (no breeding UI); the test only
 * asserts the dialog around it completes without crashing.
 */
import {
  launchGame,
  setupGame,
  walkTo,
  waitForIdle,
  getEvents,
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

interface DaycareState {
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

/** Press interact a few times to power past any open dialog/cutscene chain. */
async function dismissDialogs(page: Page, maxSteps = 12): Promise<void> {
  for (let i = 0; i < maxSteps; i++) {
    await interact(page);
    await page.waitForTimeout(120);
    const events = await page.evaluate(() => [...window.A!.events]);
    const closed = events.findLast?.((e) => e.type === "dialog_closed");
    if (closed) break;
  }
  await waitForIdle(page).catch(() => undefined);
}

/** Wait until either the mapKey or player tile changes (post-teleport). */
async function waitForMap(page: Page, mapKey: string, timeoutMs = 7000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const s = (await page.evaluate(() => window.A!.getState())) as DaycareState;
    if (s.mapKey === mapKey) return;
    await page.waitForTimeout(120);
  }
  throw new Error(`Timed out waiting for mapKey=${mapKey}`);
}

async function testFrontDoorEntry(): Promise<void> {
  console.log("[front entry] launching...");
  const { page, close } = await launchGame();
  try {
    // Stand one south of the front-door trigger tile in paper_town.
    await setupGame(page, { map: "spyder_paper_town", tileX: 20, tileY: 6 });
    await waitForIdle(page);

    // Step onto (20,4) — the Teleport to Daycare trigger tile. The teleport
    // restarts the scene mid-walkTo; fire-and-forget, then poll.
    walkTo(page, 20, 4, "up").catch(() => undefined);
    await waitForMap(page, "spyder_paper_daycare");

    const s = (await getState(page)) as DaycareState;
    assert(
      s.player?.tileX === 3 && s.player?.tileY === 8,
      `expected to land at (3,8) on daycare, got (${s.player?.tileX},${s.player?.tileY})`,
    );

    // Granny is auto-spawned by the Create Granny Piper event on map entry.
    await waitForIdle(page);
    const after = (await getState(page)) as DaycareState;
    const granny = after.npcs.find((n) => n.slug === "spyder_grannypiper");
    assert(!!granny, "expected spyder_grannypiper to spawn on daycare entry");
    assert(
      granny!.tileX === 3 && granny!.tileY === 6 && granny!.facing === "right",
      `expected Granny at (3,6) facing right, got (${granny!.tileX},${granny!.tileY}) ${granny!.facing}`,
    );

    await screenshot(page, "paper-daycare-front-entry");
    console.log("[front entry] OK");
  } finally {
    await close();
  }
}

async function testGrannyFirstAndSecondGreeting(): Promise<void> {
  console.log("[granny first/second greet] launching...");
  const { page, close } = await launchGame();
  try {
    // Pre-Timber state — no seentimber, no spokengrannypiper.
    await setupGame(page, { map: "spyder_paper_daycare", tileX: 3, tileY: 7 });
    await waitForIdle(page);

    // Face north so we're facing Granny at (3,6).
    await walkTo(page, 3, 7, "up");
    await waitForIdle(page);

    const greet1 = await pressUntilDialog(page);
    // The msgid template uses ${{name}} — the rendered text starts with "Oh hello".
    assert(
      /Oh hello/.test(greet1),
      `expected first-meeting dialog ("Oh hello..."), got: ${greet1.slice(0, 80)}`,
    );

    await screenshot(page, "paper-daycare-granny-first");
    await dismissDialogs(page);

    const afterFirst = (await getState(page)) as DaycareState;
    assert(
      afterFirst.session?.variables?.spokengrannypiper === "yes",
      `expected spokengrannypiper=yes after first greet, got ${afterFirst.session?.variables?.spokengrannypiper}`,
    );

    // Second-meeting dialog now that spokengrannypiper is set.
    await walkTo(page, 3, 7, "up");
    await waitForIdle(page);
    const greet2 = await pressUntilDialog(page);
    assert(
      greet2 !== greet1,
      `expected second-meeting dialog to differ from first; both were: ${greet1.slice(0, 60)}`,
    );
    await dismissDialogs(page);

    console.log("[granny first/second greet] OK");
  } finally {
    await close();
  }
}

async function testGrannyIntroduceDaycarePostTimber(): Promise<void> {
  console.log("[granny introduce daycare] launching...");
  const { page, close } = await launchGame();
  try {
    // Post-Timber but pre-introducedaycare — fires Talk Granny Piper Open 1.
    await setupGame(page, {
      map: "spyder_paper_daycare",
      tileX: 3,
      tileY: 7,
      variables: { seentimber: "yes" },
    });
    await waitForIdle(page);
    await walkTo(page, 3, 7, "up");
    await waitForIdle(page);

    const text = await pressUntilDialog(page);
    // grannypiper3 is a longer 357-char monologue introducing the daycare.
    assert(
      text.length > 120,
      `expected long introduce-daycare monologue, got short: ${text}`,
    );
    await dismissDialogs(page);

    const s = (await getState(page)) as DaycareState;
    assert(
      s.session?.variables?.introducedaycare === "yes",
      `expected introducedaycare=yes after intro dialog, got ${s.session?.variables?.introducedaycare}`,
    );

    console.log("[granny introduce daycare] OK");
  } finally {
    await close();
  }
}

async function testGrannyNoMonster(): Promise<void> {
  console.log("[granny no monster] launching...");
  const { page, close } = await launchGame();
  try {
    await setupGame(page, {
      map: "spyder_paper_daycare",
      tileX: 3,
      tileY: 7,
      monsters: [],
      variables: { seentimber: "yes", introducedaycare: "yes" },
    });
    await waitForIdle(page);
    await walkTo(page, 3, 7, "up");
    await waitForIdle(page);

    const text = await pressUntilDialog(page);
    // grannypiper9 — "you need a monster" branch (~72 chars).
    assert(text.length > 0, "expected non-empty no-monster dialog");
    await dismissDialogs(page);
    console.log("[granny no monster] OK");
  } finally {
    await close();
  }
}

async function testGrannyYesMonsterStubDaycare(): Promise<void> {
  console.log("[granny yes monster] launching...");
  const { page, close } = await launchGame();
  try {
    // Party size strictly > 1 → fires the Yes Monster branch (with daycare
    // action). The daycare action is a registered stub (console.warn'd).
    await setupGame(page, {
      map: "spyder_paper_daycare",
      tileX: 3,
      tileY: 7,
      monsters: [
        { slug: "budaye", level: 5 },
        { slug: "rockitten", level: 5 },
      ],
      variables: { seentimber: "yes", introducedaycare: "yes" },
    });
    await waitForIdle(page);
    await walkTo(page, 3, 7, "up");
    await waitForIdle(page);

    const text = await pressUntilDialog(page);
    assert(text.length > 0, "expected non-empty yes-monster dialog");
    // Dismiss; the chained `daycare player` action runs after the dialog
    // closes. The stub completes immediately so the chain should finish.
    await dismissDialogs(page);
    // No crash, no hang — just verify the engine returned to idle.
    await waitForIdle(page);
    console.log("[granny yes monster] OK (daycare action stub completed)");
  } finally {
    await close();
  }
}

async function testPamphletPostTimber(): Promise<void> {
  console.log("[pamphlet post-timber] launching...");
  const { page, close } = await launchGame();
  try {
    await setupGame(page, {
      map: "spyder_paper_daycare",
      tileX: 8,
      tileY: 6,
      variables: { seentimber: "yes" },
    });
    await waitForIdle(page);
    // Face the pamphlet at (8,5) from one tile south.
    await walkTo(page, 8, 6, "up");
    await waitForIdle(page);

    const text = await pressUntilDialog(page);
    // grannypiper8 — post-Timber pamphlet (~232 chars).
    assert(text.length > 100, `expected long post-Timber pamphlet, got: ${text}`);
    await dismissDialogs(page);
    console.log("[pamphlet post-timber] OK");
  } finally {
    await close();
  }
}

async function testPamphletPreTimber(): Promise<void> {
  console.log("[pamphlet pre-timber] launching...");
  const { page, close } = await launchGame();
  try {
    await setupGame(page, { map: "spyder_paper_daycare", tileX: 8, tileY: 6 });
    await waitForIdle(page);
    await walkTo(page, 8, 6, "up");
    await waitForIdle(page);

    const text = await pressUntilDialog(page);
    // grannypiper10 — pre-Timber pamphlet ("It looks like a business plan.").
    assert(
      /business plan/i.test(text),
      `expected pre-Timber pamphlet ("business plan"), got: ${text}`,
    );
    await dismissDialogs(page);
    console.log("[pamphlet pre-timber] OK");
  } finally {
    await close();
  }
}

async function testFrontDoorExit(): Promise<void> {
  console.log("[front exit] launching...");
  const { page, close } = await launchGame();
  try {
    // Stand at (3,7) facing down; step onto (3,8) — the front-door trigger
    // (2,8 width 2). The teleport restarts the scene mid-walk.
    await setupGame(page, { map: "spyder_paper_daycare", tileX: 3, tileY: 7 });
    await waitForIdle(page);
    walkTo(page, 3, 8, "down").catch(() => undefined);
    await waitForMap(page, "spyder_paper_town");

    const s = (await getState(page)) as DaycareState;
    assert(
      s.player?.tileX === 20 && s.player?.tileY === 5,
      `expected paper_town (20,5), got (${s.player?.tileX},${s.player?.tileY})`,
    );
    await screenshot(page, "paper-daycare-front-exit");
    console.log("[front exit] OK");
  } finally {
    await close();
  }
}

async function testBackDoorEntry(): Promise<void> {
  console.log("[back entry] launching...");
  const { page, close } = await launchGame();
  try {
    // Town-side back-door trigger is at (21,3) and requires facing left
    // (see spyder_paper_town.yaml "Teleport to Daycare Back").
    await setupGame(page, { map: "spyder_paper_town", tileX: 22, tileY: 3 });
    await waitForIdle(page);
    walkTo(page, 21, 3, "left").catch(() => undefined);
    await waitForMap(page, "spyder_paper_daycare");

    const s = (await getState(page)) as DaycareState;
    assert(
      s.player?.tileX === 13 && s.player?.tileY === 7,
      `expected daycare (13,7), got (${s.player?.tileX},${s.player?.tileY})`,
    );
    await screenshot(page, "paper-daycare-back-entry");
    console.log("[back entry] OK");
  } finally {
    await close();
  }
}

async function testBackDoorExit(): Promise<void> {
  console.log("[back exit] launching...");
  const { page, close } = await launchGame();
  try {
    // From (12,7), step east onto (13,7) facing right — the back-door
    // teleport ("Teleport to Back" event).
    await setupGame(page, { map: "spyder_paper_daycare", tileX: 12, tileY: 7 });
    await waitForIdle(page);
    walkTo(page, 13, 7, "right").catch(() => undefined);
    await waitForMap(page, "spyder_paper_town");

    const s = (await getState(page)) as DaycareState;
    assert(
      s.player?.tileX === 22 && s.player?.tileY === 3,
      `expected paper_town (22,3), got (${s.player?.tileX},${s.player?.tileY})`,
    );
    console.log("[back exit] OK");
  } finally {
    await close();
  }
}

async function testFlashbackCutscene(): Promise<void> {
  console.log("[flashback] launching...");
  const { page, close } = await launchGame();
  try {
    // Force the gating variable so the FlashBack Billie Grandma event fires
    // on map entry (it has no x/y, runs unconditionally when the gate is set).
    // Spawn the player at (3,5) — well clear of (3,8), which is on the
    // "Teleport to Cotton Town" front-door trigger (width=2 height=1 covers
    // (2,8) and (3,8)). Landing on that trigger would immediately bounce
    // the player back to paper_town before the flashback could even start.
    await setupGame(page, {
      map: "spyder_paper_daycare",
      tileX: 3,
      tileY: 5,
      variables: { billie_grandma: "yes" },
    });

    // The cutscene plays 13 dialogs back-to-back. Spam interact for a while
    // to advance them. Once we've teleported to rival_downstairs, stop.
    const deadline = Date.now() + 60_000;
    let teleported = false;
    let snappedMid = false;
    while (Date.now() < deadline) {
      const s = (await page
        .evaluate(() => window.A!.getState())
        .catch(() => null)) as DaycareState | null;
      if (s?.mapKey === "spyder_paper_rival_downstairs") {
        teleported = true;
        break;
      }
      if (!snappedMid) {
        // Snap a mid-cutscene screenshot once a dialog has opened.
        const events = await page
          .evaluate(() => [...window.A!.events])
          .catch(() => [] as { type: string }[]);
        if (events.some((e) => e.type === "dialog_opened")) {
          await screenshot(page, "paper-daycare-flashback").catch(() => "");
          snappedMid = true;
        }
      }
      await interact(page).catch(() => undefined);
      await page.waitForTimeout(180);
    }
    assert(teleported, "expected to land in spyder_paper_rival_downstairs after flashback");

    const s = (await getState(page)) as DaycareState;
    assert(
      s.player?.tileX === 7 && s.player?.tileY === 9,
      `expected rival_downstairs (7,9), got (${s.player?.tileX},${s.player?.tileY})`,
    );
    assert(
      s.session?.variables?.billie_grandma === "done",
      `expected billie_grandma=done, got ${s.session?.variables?.billie_grandma}`,
    );
    assert(
      s.session?.variables?.flashback === "off",
      `expected flashback=off, got ${s.session?.variables?.flashback}`,
    );

    console.log("[flashback] OK");
  } finally {
    await close();
  }
}

async function main(): Promise<void> {
  await testFrontDoorEntry();
  await testGrannyFirstAndSecondGreeting();
  await testGrannyIntroduceDaycarePostTimber();
  await testGrannyNoMonster();
  await testGrannyYesMonsterStubDaycare();
  await testPamphletPostTimber();
  await testPamphletPreTimber();
  await testFrontDoorExit();
  await testBackDoorEntry();
  await testBackDoorExit();
  await testFlashbackCutscene();
  console.log("paper-daycare-test: OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
