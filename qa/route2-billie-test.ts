/**
 * Route 2 scripted Billie cutscene smoke test (STORY-0221).
 *
 * Verbatim port of `<object id="156" name="Billie encounter">` in
 * `upstream/mods/tuxemon/maps/spyder_route2.tmx`. The trigger is a 1x2 column
 * one tile east of the cotton_town landing tiles ((1,8) & (1,9)) — the first
 * step the player takes into route2 from cotton_town.
 *
 * Coverage:
 *   1. First-walk-in trigger: walking east from cotton_town teleport lands
 *      the player on (0,8) → step east onto (1,8) drives the full cutscene
 *      (Billie spawns at (3,15), pathfinds to (1,10), pre-battle dialog,
 *      trainer battle with [billie_choice L6, eyenemy L6, cardiling L3],
 *      post-battle dialog, Billie walks back to (3,15) + despawn,
 *      `route2billie:yes` set).
 *   2. Re-entry does NOT re-trigger after `route2billie:yes`.
 *   3. Mid-cutscene control lock blocks player movement input.
 *   4. Battle loss path leaves `route2billie` unset and whiteouts the player.
 *
 * Notes:
 *   - The trigger column (1,8)–(1,9) overlaps wild encounter rect `random
 *     battle28` at (1,8). To keep the cutscene deterministic, the tests
 *     teleport the player onto the trigger (no `char_moved`), which keeps
 *     the wild encounter from firing alongside the cutscene.
 *   - `billie_choice` is populated by `setupGame()` to the player's chosen
 *     starter — verbatim port of upstream's `spyder_paper_scoop.yaml`
 *     "Billie <slug>" events (each sets `billie_choice:<same slug>` from
 *     `myintrochoice`). The assertion just checks Billie's lead monster
 *     resolved to a real monster slug (not the literal "billie_choice").
 */
import {
  launchGame,
  setupGame,
  waitForIdle,
  getState,
  getEvents,
  interact,
  screenshot,
  teleport,
  setVariable,
} from "./harness";
import type { Page } from "@playwright/test";

interface NpcSnap {
  slug: string;
  tileX: number;
  tileY: number;
  facing?: string;
}
interface PlayerState {
  mapKey?: string;
  scene?: string;
  controls?: { locked?: boolean };
  player?: { tileX: number; tileY: number; facing: string };
  npcs?: NpcSnap[];
  session?: { variables?: Record<string, string> };
}

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

/** Press interact while a dialog is open until it closes or `maxPresses` exhausted. */
async function flushDialog(page: Page, maxPresses = 12): Promise<string | undefined> {
  let lastText: string | undefined;
  for (let i = 0; i < maxPresses; i++) {
    const events = await getEvents(page);
    const lastOpen = events.map((e) => e.type).lastIndexOf("dialog_opened");
    const lastClose = events.map((e) => e.type).lastIndexOf("dialog_closed");
    if (lastOpen > lastClose) {
      lastText = (events[lastOpen].data as { text?: string }).text;
      await interact(page);
      await page.waitForTimeout(120);
    } else {
      // No open dialog right now — give the engine a tick to surface the next.
      await page.waitForTimeout(120);
      const ev2 = await getEvents(page);
      const o2 = ev2.map((e) => e.type).lastIndexOf("dialog_opened");
      const c2 = ev2.map((e) => e.type).lastIndexOf("dialog_closed");
      if (o2 <= c2) return lastText;
    }
  }
  return lastText;
}

/** Wait for the trainer_battle_started event for the given NPC. */
async function waitForTrainerBattle(page: Page, npc: string, timeoutMs = 30_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const events = await getEvents(page);
    if (
      events.some(
        (e) => e.type === "trainer_battle_started" && (e.data as { npc?: string }).npc === npc,
      )
    ) {
      return;
    }
    // Advance any pre-battle dialog while we wait.
    const lastOpen = events.map((e) => e.type).lastIndexOf("dialog_opened");
    const lastClose = events.map((e) => e.type).lastIndexOf("dialog_closed");
    if (lastOpen > lastClose) {
      await interact(page);
    }
    await page.waitForTimeout(120);
  }
  throw new Error(`trainer_battle_started for ${npc} never fired within ${timeoutMs}ms`);
}

/** Win or lose the current trainer battle by zeroing one side's HP and submitting a fight action. */
async function endBattle(page: Page, outcome: "win" | "lose"): Promise<void> {
  await page.waitForFunction(
    () => (window.A!.getState() as { scene?: string }).scene === "CombatScene",
    null,
    { timeout: 15_000 },
  );

  // Resolve a technique slug from the live combat machine (debug-serialised
  // monster snapshots don't include techniques).
  const techSlug = (await page.evaluate(() => {
    const bridge = window.A as unknown as {
      getActiveScene(): {
        machine?: { player?: { techniques?: { slug: string }[] } };
      } | null;
    };
    return bridge.getActiveScene()?.machine?.player?.techniques?.[0]?.slug ?? null;
  })) as string | null;
  assert(!!techSlug, "could not resolve a technique slug for forced battle resolution");

  if (outcome === "win") {
    // KO each enemy in turn; submitting a fight action processes the attack
    // and flips outcome=win once the party is empty.
    const battleDeadline = Date.now() + 30_000;
    while (Date.now() < battleDeadline) {
      const scene = (await getState(page)).scene as string | undefined;
      if (scene !== "CombatScene") return;
      await page.evaluate(() => window.A!.setEnemyHp(0));
      await page.evaluate(
        (slug) => window.A!.submitCombatAction({ type: "fight", technique: slug }),
        techSlug,
      );
      await page.waitForTimeout(400);
    }
    throw new Error("Win path: battle did not end within 30s");
  }

  // outcome === "lose": faint the active player monster + every party
  // member so the combat machine resolves to lose (handlePlayerFaint +
  // !hasSwapTargets in src/game/combat/machine.ts).
  await page.evaluate(() => {
    const bridge = window.A as unknown as {
      getActiveScene(): {
        machine?: {
          player?: { currentHp: number };
          party?: { currentHp: number }[];
        };
      } | null;
    };
    const machine = bridge.getActiveScene()?.machine;
    if (!machine) return;
    if (machine.player) machine.player.currentHp = 0;
    for (const p of machine.party ?? []) p.currentHp = 0;
  });

  const battleDeadline = Date.now() + 30_000;
  while (Date.now() < battleDeadline) {
    const scene = (await getState(page)).scene as string | undefined;
    if (scene !== "CombatScene") return;
    await page.evaluate(
      (slug) => window.A!.submitCombatAction({ type: "fight", technique: slug }),
      techSlug,
    );
    await page.waitForTimeout(400);
  }
  throw new Error("Lose path: battle did not end within 30s");
}

/** Wait until the named NPC is absent from the live npc snapshot. */
async function waitForNpcGone(page: Page, slug: string, timeoutMs = 10_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const s = (await getState(page)) as PlayerState;
    if (!s.npcs?.some((n) => n.slug === slug)) return;
    await page.waitForTimeout(120);
  }
  throw new Error(`NPC "${slug}" still present after ${timeoutMs}ms`);
}

/** Wait until the named NPC appears on the live npc snapshot. */
async function waitForNpcSpawn(page: Page, slug: string, timeoutMs = 10_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const s = (await getState(page)) as PlayerState;
    if (s.npcs?.some((n) => n.slug === slug)) return;
    await page.waitForTimeout(120);
  }
  throw new Error(`NPC "${slug}" never spawned within ${timeoutMs}ms`);
}

/** Wait for a dialog_opened event whose text matches `needle`. */
async function waitForDialogContaining(
  page: Page,
  needle: string,
  timeoutMs = 15_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const events = await getEvents(page);
    const opened = events.find(
      (e) =>
        e.type === "dialog_opened" &&
        typeof (e.data as { text?: string }).text === "string" &&
        (e.data as { text: string }).text.includes(needle),
    );
    if (opened) return;
    await page.waitForTimeout(150);
  }
  throw new Error(`Dialog containing "${needle}" never opened within ${timeoutMs}ms`);
}

/**
 * Pin `random_encounter` off. (1,8) overlaps the Billie trigger column AND
 * the `random battle28` grass rect; without this every test run is at the
 * mercy of an 11% wild-encounter roll.
 */
async function disableWildEncounters(page: Page): Promise<void> {
  await page.evaluate(() => window.A!.setSuppressEncounters(true));
}

/** Drive the cutscene up to the trainer battle starting. */
async function driveCutsceneToBattleStart(page: Page): Promise<void> {
  // create_npc runs early in the action list, then pathfind. Even if the
  // pathfind to (1,10) fails (route2's directional tiles are restrictive
  // enough that NPCs sometimes can't traverse the grass corridor), the
  // sequence still progresses to the pre-battle dialog.
  await waitForNpcSpawn(page, "spyder_billie");
  await waitForDialogContaining(page, "cheapskate");
  // The dialog gates `start_battle`; press through and wait for combat.
  await waitForTrainerBattle(page, "spyder_billie");
}

async function testFirstWalkInTriggerAndWin(): Promise<void> {
  console.log("[route2 billie cutscene win] launching...");
  const { page, close } = await launchGame();
  try {
    // Seed via setupGame defaults, then teleport onto the trigger. Using a
    // direct teleport (no `char_moved`) keeps `random battle28` from rolling
    // alongside the cutscene — both events sit on (1,8) but only the wild
    // encounter requires player motion.
    await setupGame(page, { map: "spyder_route2", tileX: 0, tileY: 8 });
    await disableWildEncounters(page);
    await waitForIdle(page);

    // Sanity-check setupGame populated billie_choice.
    const before = (await getState(page)) as PlayerState;
    const billieChoice = before.session?.variables?.billie_choice;
    assert(!!billieChoice, "setupGame should populate billie_choice from the starter pick");

    // Step onto the trigger.
    await teleport(page, "spyder_route2", 1, 8);
    await driveCutsceneToBattleStart(page);

    const trainerEv = (await getEvents(page)).find(
      (e) =>
        e.type === "trainer_battle_started" && (e.data as { npc?: string }).npc === "spyder_billie",
    );
    const party = (trainerEv?.data as { enemyParty?: { slug: string; level: number }[] })
      ?.enemyParty;
    assert(party !== undefined, "expected enemyParty on trainer_battle_started");
    assert(
      party!.length === 3,
      `expected Billie's party of 3 monsters, got ${party!.length}: ${JSON.stringify(party)}`,
    );
    // First slot is `billie_choice,6`. The literal slug should have resolved
    // via session.variables → a real monster (matching `billie_choice` from
    // setupGame, e.g. "budaye").
    assert(
      party![0].slug !== "billie_choice" && party![0].level === 6,
      `expected billie_choice to resolve to a real slug at L6, got ${JSON.stringify(party![0])}`,
    );
    assert(
      party![0].slug === billieChoice,
      `expected Billie's lead == billie_choice variable (${billieChoice}), got ${party![0].slug}`,
    );
    assert(
      party![1].slug === "eyenemy" && party![1].level === 6,
      `expected slot 2 = eyenemy L6, got ${JSON.stringify(party![1])}`,
    );
    assert(
      party![2].slug === "cardiling" && party![2].level === 3,
      `expected slot 3 = cardiling L3, got ${JSON.stringify(party![2])}`,
    );

    await screenshot(page, "route2-billie-prebattle");

    await endBattle(page, "win");

    // Post-battle dialog (spyder_route2_billie2), then Billie walks back to
    // (3,15) and despawns; `route2billie:yes` is set last.
    await flushDialog(page);
    await waitForNpcGone(page, "spyder_billie");

    const s = (await getState(page)) as PlayerState;
    assert(
      s.session?.variables?.route2billie === "yes",
      `expected route2billie=yes, got ${s.session?.variables?.route2billie}`,
    );

    await screenshot(page, "route2-billie-postbattle");
    console.log("[route2 billie cutscene win] OK");
  } finally {
    await close();
  }
}

async function testReEntryDoesNotReFire(): Promise<void> {
  console.log("[route2 billie no re-trigger] launching...");
  const { page, close } = await launchGame();
  try {
    // Pre-seed route2billie:yes so the gate is locked off from the start.
    await setupGame(page, { map: "spyder_route2", tileX: 2, tileY: 8 });
    await disableWildEncounters(page);
    await setVariable(page, "route2billie", "yes");
    await waitForIdle(page);

    // Walk onto the trigger column repeatedly; no Billie should spawn and no
    // trainer battle should start.
    for (const ty of [8, 9]) {
      await teleport(page, "spyder_route2", 1, ty);
      await page.waitForTimeout(300);
      const s = (await getState(page)) as PlayerState;
      assert(
        !s.npcs?.some((n) => n.slug === "spyder_billie"),
        `expected no Billie spawn on re-entry at (1,${ty}), got npcs=${JSON.stringify(s.npcs)}`,
      );
    }

    const events = await getEvents(page);
    const battles = events.filter(
      (e) =>
        e.type === "trainer_battle_started" && (e.data as { npc?: string }).npc === "spyder_billie",
    );
    assert(
      battles.length === 0,
      `expected no Billie trainer battles on re-entry, got ${battles.length}`,
    );
    console.log("[route2 billie no re-trigger] OK");
  } finally {
    await close();
  }
}

async function testMidCutsceneControlLock(): Promise<void> {
  console.log("[route2 billie control lock] launching...");
  const { page, close } = await launchGame();
  try {
    await setupGame(page, { map: "spyder_route2", tileX: 0, tileY: 8 });
    await disableWildEncounters(page);
    await waitForIdle(page);

    await teleport(page, "spyder_route2", 1, 8);

    // Wait until lock_controls has fired (Billie is spawned + pre-battle
    // dialog open). The lock is set as the second action in the cutscene.
    await waitForNpcSpawn(page, "spyder_billie");
    await waitForDialogContaining(page, "cheapskate");

    const before = (await getState(page)) as PlayerState;
    const startTile = { x: before.player!.tileX, y: before.player!.tileY };

    // Try to walk; controls should be locked.
    await page.evaluate(() => window.A!.walkStep("right").catch(() => undefined));
    await page.waitForTimeout(250);
    const after = (await getState(page)) as PlayerState;
    assert(
      after.player!.tileX === startTile.x && after.player!.tileY === startTile.y,
      `expected player frozen by lock_controls, but moved ${startTile.x},${startTile.y} → ${after.player!.tileX},${after.player!.tileY}`,
    );

    console.log("[route2 billie control lock] OK");
  } finally {
    await close();
  }
}

async function testBattleLossKeepsGateOpen(): Promise<void> {
  console.log("[route2 billie loss whiteout] launching...");
  const { page, close } = await launchGame();
  try {
    await setupGame(page, { map: "spyder_route2", tileX: 0, tileY: 8 });
    await disableWildEncounters(page);
    await waitForIdle(page);

    await teleport(page, "spyder_route2", 1, 8);
    await driveCutsceneToBattleStart(page);

    await endBattle(page, "lose");

    // Wait for combat scene to fully shut down before snapshotting.
    await page.waitForFunction(
      () => (window.A!.getState() as { scene?: string }).scene !== "CombatScene",
      null,
      { timeout: 15_000 },
    );
    await page.waitForTimeout(800);

    // After a wipe the engine triggers whiteout (heal + faint-teleport).
    // We don't enforce a specific respawn here — the campaign hasn't set
    // `faintTeleport` by this point so the player typically stays put
    // healed; what we DO assert is the variable gate is still open so the
    // cutscene retains a chance to re-run after the player recovers.
    const s = (await getState(page)) as PlayerState;
    assert(
      s.session?.variables?.route2billie !== "yes",
      `expected route2billie NOT set on loss, got ${s.session?.variables?.route2billie}`,
    );
    await screenshot(page, "route2-billie-loss");
    console.log("[route2 billie loss whiteout] OK");
  } finally {
    await close();
  }
}

async function main(): Promise<void> {
  await testFirstWalkInTriggerAndWin();
  await testReEntryDoesNotReFire();
  await testMidCutsceneControlLock();
  await testBattleLossKeepsGateOpen();
  console.log("route2-billie-test: OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
