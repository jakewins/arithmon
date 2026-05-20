/**
 * Smoke test for the spyder_paper_scoop intro cutscene (STORY-0197).
 *
 * Drives the player through the choreographed first-visit scene that
 * upstream's verbatim `spyder_paper_scoop.yaml` describes:
 *   1. Land at (4,8) with no party and no intro flags — 7 NPCs spawn.
 *   2. The `Intro Storekeeper` event fires: dialog, Dante walks the inspection
 *      circuit, then the rename prompt.
 *   3. Pick a starter from the `Choice` menu (budaye), confirm, then the
 *      `Continue Storekeeper` exit choreography teleports back to spyder_bedroom.
 *   4. **The chosen monster is NOT added to the player's party** — the scoop
 *      records the choice via `myintrochoice` / `billie_choice` but never
 *      grants the player a monster. The starter comes from paper_town's bins.
 */
import { launchGame, setupGame, waitForIdle, getState, screenshot, interact } from "./harness";
import type { Page } from "@playwright/test";

interface NpcSnapshot {
  slug: string;
  tileX: number;
  tileY: number;
  facing: string;
}

interface ScoopState {
  scene: string;
  mapKey?: string;
  player?: { tileX: number; tileY: number; facing: string };
  session?: {
    monsters: { slug: string }[];
    variables?: Record<string, string>;
  };
  npcs: NpcSnapshot[];
}

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

/** The 7 NPCs spawned by the upstream `Create NPCs` event, with target tiles. */
const EXPECTED_NPCS: ReadonlyArray<{ slug: string; tileX: number; tileY: number }> = [
  { slug: "spyder_shopkeeper", tileX: 7, tileY: 6 },
  { slug: "spyder_dante", tileX: 7, tileY: 7 },
  { slug: "spyder_papermart_miles", tileX: 4, tileY: 7 },
  { slug: "spyder_papermart_shirley", tileX: 4, tileY: 6 },
  { slug: "spyder_route2_roddick", tileX: 4, tileY: 5 },
  { slug: "spyder_papermart_harith", tileX: 4, tileY: 4 },
  { slug: "spyder_billie", tileX: 4, tileY: 3 },
];

/**
 * Press interact in a loop until one of `stopEvents` shows up in the rolling
 * buffer. Used to power through the chain of typewriter dialogs without
 * hard-coding press counts.
 */
async function pressUntilEvent(
  page: Page,
  stopEvents: string[],
  maxSteps = 40,
  delayMs = 120,
): Promise<string> {
  // Snapshot the rolling buffer length so we only care about new events.
  const baseline = await page.evaluate(() => window.A!.events.length);
  for (let i = 0; i < maxSteps; i++) {
    await interact(page);
    await page.waitForTimeout(delayMs);
    const seen = await page.evaluate(
      ({ types, start }) =>
        window
          .A!.events.slice(start)
          .filter((e) => types.includes(e.type))
          .map((e) => e.type),
      { types: stopEvents, start: baseline },
    );
    if (seen.length > 0) return seen[seen.length - 1];
  }
  throw new Error(
    `pressUntilEvent: no event in ${JSON.stringify(stopEvents)} after ${maxSteps} interacts`,
  );
}

async function testIntroCutscene(): Promise<void> {
  console.log("[intro cutscene] launching...");
  const { page, close } = await launchGame();
  try {
    // Drop the player at the scoop spawn point (4,8) with no party and the
    // intro flags cleared — exactly what the bedroom cinematic leaves behind.
    await setupGame(page, {
      map: "spyder_paper_scoop",
      tileX: 4,
      tileY: 8,
      monsters: [],
      variables: {
        intro_scoop: null,
        choice_phase: null,
        myintrochoice: null,
        billie_choice: null,
        got_starter: null,
      },
    });
    await page.waitForTimeout(400); // give Create NPCs + Intro Storekeeper a tick

    // Verify all 7 cutscene NPCs spawned at their upstream positions.
    const initial = (await getState(page)) as unknown as ScoopState;
    for (const expected of EXPECTED_NPCS) {
      const npc = initial.npcs.find((n) => n.slug === expected.slug);
      assert(
        !!npc,
        `expected NPC ${expected.slug} to spawn, npcs=${JSON.stringify(initial.npcs.map((n) => n.slug))}`,
      );
      assert(
        npc!.tileX === expected.tileX && npc!.tileY === expected.tileY,
        `${expected.slug} at wrong tile: expected (${expected.tileX},${expected.tileY}), got (${npc!.tileX},${npc!.tileY})`,
      );
    }

    // Advance through the opening dialog + Dante's walk circuit until the
    // rename prompt opens. Upstream YAML emits 4 dialogs (shopkeeper1,
    // shopkeeper2 twice, question_name) between several pathfind steps, so
    // give it plenty of headroom.
    await pressUntilEvent(page, ["rename_started"], 120, 150);

    // Type a name and press Enter to confirm. The Enter handler sets
    // `done = true` immediately, then the engine ticks through the trailing
    // `set_variable choice_phase:yes` and `unlock_controls` actions.
    await page.evaluate(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    await page.waitForTimeout(500);

    let st = (await getState(page)) as unknown as ScoopState;
    assert(
      st.session?.variables?.choice_phase === "yes" ||
        st.session?.variables?.choice_phase === "next",
      `expected choice_phase=yes|next after rename, got ${st.session?.variables?.choice_phase}`,
    );

    // The Choice event auto-fires next tick — it may already have completed
    // by the time we look. Poll the rolling event buffer for choice_presented
    // rather than racing waitForEvent against an already-opened menu.
    const choicePresented = await page.evaluate(async () => {
      for (let i = 0; i < 50; i++) {
        const events = window.A!.events;
        const found = events.find((e) => e.type === "choice_presented");
        if (found) return found;
        await new Promise((r) => setTimeout(r, 100));
      }
      return null;
    });
    if (!choicePresented) throw new Error("Choice menu never opened");
    await screenshot(page, "paper-scoop-choice");

    // The Choice event lists all 5 upstream starters.
    const options = ((choicePresented as { data: { options?: string[] } }).data.options ?? []) as string[];
    assert(
      options.length === 5,
      `expected 5 choice options, got ${options.length}: ${JSON.stringify(options)}`,
    );

    // Pick budaye (index 0). Snapshot the choice_presented count first so we
    // can later tell when the Confirm Monster menu (a second choice menu)
    // opens.
    const choicesBeforeConfirm = await page.evaluate(
      () => window.A!.events.filter((e) => e.type === "choice_presented").length,
    );
    await page.evaluate(() => window.A!.selectChoice(0));
    await page.waitForTimeout(300);

    st = (await getState(page)) as unknown as ScoopState;
    assert(
      st.session?.variables?.myintrochoice === "budaye",
      `expected myintrochoice=budaye after Choice, got ${st.session?.variables?.myintrochoice}`,
    );
    // The Billie Budaye sibling event mirrors the choice into billie_choice.
    assert(
      st.session?.variables?.billie_choice === "budaye",
      `expected billie_choice=budaye after Choice, got ${st.session?.variables?.billie_choice}`,
    );
    assert(
      st.session?.variables?.choice_phase === "next",
      `expected choice_phase=next after Choice, got ${st.session?.variables?.choice_phase}`,
    );

    // Confirm Monster dialog choice (yes:no) — pick yes. Poll for the menu so
    // we don't race against an already-opened state.
    await page.evaluate(async (baseline) => {
      for (let i = 0; i < 50; i++) {
        const count = window.A!.events.filter((e) => e.type === "choice_presented").length;
        if (count > baseline) return;
        await new Promise((r) => setTimeout(r, 100));
      }
      throw new Error("Confirm Monster menu never opened");
    }, choicesBeforeConfirm);
    await page.evaluate(() => window.A!.selectChoice(0));
    await page.waitForTimeout(300);

    st = (await getState(page)) as unknown as ScoopState;
    assert(
      st.session?.variables?.choice_phase === "progress",
      `expected choice_phase=progress after Confirm Yes, got ${st.session?.variables?.choice_phase}`,
    );

    // Now Continue Storekeeper fires its exit choreography: 5 NPCs walk off
    // through (6,10) and despawn, the player pathfinds to (6,7), shopkeeper
    // walks down, the shopkeeper4 dialog plays, then the player pathfinds to
    // (6,10) and we transition_teleport back to spyder_bedroom. Pathfinds run
    // at 60 px/s, so the chain takes ~25-30s of wallclock. Press interact
    // whenever a dialog is open so the typewriter advances; poll the buffer
    // for the bedroom teleport.
    let bedroomReached = false;
    for (let tick = 0; tick < 120 && !bedroomReached; tick++) {
      await page.waitForTimeout(500);
      const events = await page.evaluate(() => [...window.A!.events]);
      bedroomReached = events.some(
        (e) => e.type === "teleport" && (e.data as { map?: string }).map === "spyder_bedroom",
      );
      // A dialog is "open" iff its last `dialog_opened` index is greater than
      // its last `dialog_closed` index — press interact to advance it.
      const lastOpen = events.map((e) => e.type).lastIndexOf("dialog_opened");
      const lastClose = events.map((e) => e.type).lastIndexOf("dialog_closed");
      if (lastOpen > lastClose) await interact(page);
    }
    if (!bedroomReached) {
      throw new Error("Continue Storekeeper never teleported back to spyder_bedroom");
    }
    await page.waitForTimeout(1000);
    await waitForIdle(page);

    const final = (await getState(page)) as unknown as ScoopState;
    assert(
      final.mapKey === "spyder_bedroom",
      `expected to teleport back to spyder_bedroom, got mapKey=${final.mapKey}`,
    );
    assert(
      final.player?.tileX === 3 && final.player?.tileY === 4,
      `expected to land at (3,4) in bedroom, got (${final.player?.tileX},${final.player?.tileY})`,
    );
    assert(
      final.session?.variables?.intro_scoop === "done",
      `expected intro_scoop=done after exit, got ${final.session?.variables?.intro_scoop}`,
    );

    // Critical: the scoop choice must NOT have added a monster to the party.
    assert(
      (final.session?.monsters?.length ?? 0) === 0,
      `expected party to remain empty (scoop choice is narrative only), got ${JSON.stringify(final.session?.monsters)}`,
    );

    console.log("[intro cutscene] OK");
  } finally {
    await close();
  }
}

async function main(): Promise<void> {
  await testIntroCutscene();
  console.log("paper-scoop-intro-test: OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
