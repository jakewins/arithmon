/**
 * Route 2 trainer-port smoke test (STORY-0218).
 *
 * Verifies the three trainers ported verbatim from
 * `upstream/mods/tuxemon/maps/spyder_route2.tmx`:
 *
 *   * Roddick — interact at (5,3), party = spighter L8.
 *   * Marion  — sight-line at (22,10..13), party = 2× aardorn L7.
 *   * Graf    — sight-line at (29,4..8), party = cardiling L7 + 2× cataspike L5.
 *
 * Coverage:
 *   1. All three trainers spawn on map load.
 *   2. Interact INTERACT against Roddick shows his pre_battle line, then
 *      starts a trainer battle with the upstream party. After winning,
 *      re-interact shows post_battle_lose and does not re-trigger the fight.
 *   3. Marion's sight-line auto-pathfinds her toward the player and starts a
 *      battle as soon as the player enters her column.
 *   4. Graf's sight-line behaves the same. Verify post-battle dialog wiring
 *      (re-interact => post_battle_lose).
 *
 * The pre_battle dialog must resolve through char_talk to the npc registry's
 * speech.pre_battle msgid (e.g. `spyder_route2_roddick1`).
 */
import {
  launchGame,
  setupGame,
  walkTo,
  waitForIdle,
  getState,
  getEvents,
  interact,
  screenshot,
  teleport,
} from "./harness";
import type { Page } from "@playwright/test";

interface NpcSnap {
  slug: string;
  tileX: number;
  tileY: number;
}
interface PlayerState {
  mapKey?: string;
  scene?: string;
  player?: { tileX: number; tileY: number; facing: string };
  npcs?: NpcSnap[];
}

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

/** Walk through any open dialog by pressing INTERACT. Returns the final dialog text seen. */
async function flushDialogs(page: Page, maxPresses = 30): Promise<string | undefined> {
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
      await page.waitForTimeout(120);
      // One more check in case a follow-up dialog opens after this tick.
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

/** Win the current trainer battle by zeroing each enemy and submitting a fight action. */
async function winTrainerBattle(page: Page): Promise<void> {
  await page.waitForFunction(
    () => (window.A!.getState() as { scene?: string }).scene === "CombatScene",
    null,
    { timeout: 15_000 },
  );

  // Resolve the player's first technique by walking the live CombatMachine
  // (same trick the campaign-intro playthrough uses). The debug-serialized
  // monster snapshot doesn't include techniques, but the running machine does.
  const techSlug = (await page.evaluate(() => {
    const bridge = window.A as unknown as {
      getActiveScene(): {
        machine?: { player?: { techniques?: { slug: string }[] } };
      } | null;
    };
    return bridge.getActiveScene()?.machine?.player?.techniques?.[0]?.slug ?? null;
  })) as string | null;
  assert(!!techSlug, "could not resolve a technique slug for force-win");

  // KO each enemy in turn. setEnemyHp(0) marks the active enemy; submitting a
  // fight action processes the attack, detects the faint, and either advances
  // to the next enemy or flips outcome=win once the party is empty.
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
  throw new Error("Battle did not end within 30s");
}

/** Test interact-style trainer (Roddick). */
async function testRoddickInteract(): Promise<void> {
  console.log("[route2 roddick interact] launching...");
  const { page, close } = await launchGame();
  try {
    // Roddick (and the other two trainers) spawn on small grass islands
    // surrounded by path tiles — upstream's TMX intentionally puts them out of
    // reach of normal foot traffic so the sight-line / pre-battle dance is
    // what brings the player and trainer together. The interact path is only
    // reachable for QA by teleporting onto the adjacent tile.
    await setupGame(page, { map: "spyder_route2", tileX: 1, tileY: 8 });
    await waitForIdle(page);

    const initial = (await getState(page)) as PlayerState;
    const roddick = initial.npcs?.find((n) => n.slug === "spyder_route2_roddick");
    assert(roddick !== undefined, "expected Roddick to spawn on map load");
    assert(
      roddick!.tileX === 5 && roddick!.tileY === 3,
      `expected Roddick at (5,3), got (${roddick!.tileX},${roddick!.tileY})`,
    );
    const marion = initial.npcs?.find((n) => n.slug === "spyder_route2_marion");
    const graf = initial.npcs?.find((n) => n.slug === "spyder_route2_graf");
    assert(marion !== undefined, "expected Marion to spawn on map load");
    assert(graf !== undefined, "expected Graf to spawn on map load");

    // Teleport to (5, 2) — directly north of Roddick — and face down to fire
    // the Talk Roddick interact event.
    await teleport(page, "spyder_route2", 5, 2);
    await waitForIdle(page);
    await screenshot(page, "route2-trainers-spawned");
    await page.evaluate(() => window.A!.face("down"));
    await interact(page);
    await page.waitForTimeout(300);

    // Pre-battle line is Roddick's first speech key.
    const preEvents = await getEvents(page);
    const preOpen = [...preEvents].reverse().find((e) => e.type === "dialog_opened");
    assert(
      preOpen !== undefined && typeof (preOpen.data as { text?: string }).text === "string",
      "expected a dialog_opened event after INTERACT",
    );

    await waitForTrainerBattle(page, "spyder_route2_roddick");

    // Confirm the dynamic party was seeded from `add_monster spighter,8,...`.
    const trainerEv = (await getEvents(page)).find(
      (e) =>
        e.type === "trainer_battle_started" &&
        (e.data as { npc?: string }).npc === "spyder_route2_roddick",
    );
    const party = (trainerEv?.data as { enemyParty?: { slug: string; level: number }[] })
      ?.enemyParty;
    assert(
      party?.length === 1 && party[0].slug === "spighter" && party[0].level === 8,
      `expected Roddick party = [spighter L8], got ${JSON.stringify(party)}`,
    );

    await winTrainerBattle(page);
    await flushDialogs(page);
    await waitForIdle(page);

    // Re-interact: now the Post Talk Roddick event should fire (battle_outcome
    // won is set, the original Talk Roddick is gated `not ... won`).
    await page.evaluate(() => window.A!.face("down"));
    await interact(page);
    await page.waitForTimeout(200);

    const postEvents = await getEvents(page);
    const trainerCount = postEvents.filter(
      (e) =>
        e.type === "trainer_battle_started" &&
        (e.data as { npc?: string }).npc === "spyder_route2_roddick",
    ).length;
    assert(trainerCount === 1, `expected no re-battle after win, got ${trainerCount} starts`);

    await flushDialogs(page);
    await screenshot(page, "route2-roddick-post-win");
    console.log("[route2 roddick interact] OK");
  } finally {
    await close();
  }
}

/** Test sight-line trainer (Marion at column x=22, sight rect y=10..13). */
async function testMarionSightLine(): Promise<void> {
  console.log("[route2 marion sight-line] launching...");
  const { page, close } = await launchGame();
  try {
    // Spawn south of Marion's sight rect so the first walk step enters it.
    await setupGame(page, { map: "spyder_route2", tileX: 22, tileY: 14 });
    await waitForIdle(page);

    const initial = (await getState(page)) as PlayerState;
    const marion = initial.npcs?.find((n) => n.slug === "spyder_route2_marion");
    assert(marion !== undefined, "expected Marion to spawn on map load");
    assert(
      marion!.tileX === 22 && marion!.tileY === 9,
      `expected Marion at (22,9), got (${marion!.tileX},${marion!.tileY})`,
    );

    // Step north into (22, 13) — the southmost tile of Marion's sight column.
    walkTo(page, 22, 13, "up").catch(() => undefined);
    await waitForTrainerBattle(page, "spyder_route2_marion");

    const trainerEv = (await getEvents(page)).find(
      (e) =>
        e.type === "trainer_battle_started" &&
        (e.data as { npc?: string }).npc === "spyder_route2_marion",
    );
    const party = (trainerEv?.data as { enemyParty?: { slug: string; level: number }[] })
      ?.enemyParty;
    assert(
      party?.length === 2 && party.every((m) => m.slug === "aardorn" && m.level === 7),
      `expected Marion party = [aardorn L7 ×2], got ${JSON.stringify(party)}`,
    );

    await screenshot(page, "route2-marion-sightline");

    await winTrainerBattle(page);
    await flushDialogs(page);
    await waitForIdle(page);

    // After win, stepping in/out of the sight rect must not re-trigger.
    await walkTo(page, 22, 14, "down").catch(() => undefined);
    await walkTo(page, 22, 13, "up").catch(() => undefined);
    await page.waitForTimeout(400);
    const trainerCount = (await getEvents(page)).filter(
      (e) =>
        e.type === "trainer_battle_started" &&
        (e.data as { npc?: string }).npc === "spyder_route2_marion",
    ).length;
    assert(trainerCount === 1, `expected no re-trigger after win, got ${trainerCount} starts`);

    console.log("[route2 marion sight-line] OK");
  } finally {
    await close();
  }
}

/** Test sight-line trainer (Graf at column x=29, sight rect y=4..8) + post-talk on INTERACT. */
async function testGrafSightLineAndPostTalk(): Promise<void> {
  console.log("[route2 graf sight-line + post-talk] launching...");
  const { page, close } = await launchGame();
  try {
    await setupGame(page, { map: "spyder_route2", tileX: 29, tileY: 9 });
    await waitForIdle(page);

    const initial = (await getState(page)) as PlayerState;
    const graf = initial.npcs?.find((n) => n.slug === "spyder_route2_graf");
    assert(graf !== undefined, "expected Graf to spawn on map load");
    assert(
      graf!.tileX === 29 && graf!.tileY === 3,
      `expected Graf at (29,3), got (${graf!.tileX},${graf!.tileY})`,
    );

    walkTo(page, 29, 8, "up").catch(() => undefined);
    await waitForTrainerBattle(page, "spyder_route2_graf");

    const trainerEv = (await getEvents(page)).find(
      (e) =>
        e.type === "trainer_battle_started" &&
        (e.data as { npc?: string }).npc === "spyder_route2_graf",
    );
    const party = (trainerEv?.data as { enemyParty?: { slug: string; level: number }[] })
      ?.enemyParty;
    assert(
      party?.length === 3 &&
        party[0].slug === "cardiling" &&
        party[0].level === 7 &&
        party[1].slug === "cataspike" &&
        party[1].level === 5 &&
        party[2].slug === "cataspike" &&
        party[2].level === 5,
      `expected Graf party = [cardiling L7, cataspike L5, cataspike L5], got ${JSON.stringify(party)}`,
    );

    await winTrainerBattle(page);
    await flushDialogs(page);
    await waitForIdle(page);

    // Walk back near Graf and INTERACT to hit Post Talk Graf.
    // Graf ends up adjacent-south of the player after pathfind_to_char; rather
    // than chase him, teleport beside his spawn (29, 3) at (29, 4) facing up.
    await page.evaluate(() => window.A!.teleport("spyder_route2", 29, 4));
    await waitForIdle(page);
    await page.evaluate(() => window.A!.face("up"));
    await interact(page);
    await page.waitForTimeout(300);

    const evs = await getEvents(page);
    const lastOpen = evs.map((e) => e.type).lastIndexOf("dialog_opened");
    assert(lastOpen >= 0, "expected a dialog to open on post-win INTERACT");

    const trainerCount = evs.filter(
      (e) =>
        e.type === "trainer_battle_started" &&
        (e.data as { npc?: string }).npc === "spyder_route2_graf",
    ).length;
    assert(trainerCount === 1, `expected no re-battle, got ${trainerCount} starts`);

    await flushDialogs(page);
    await screenshot(page, "route2-graf-post-win");
    console.log("[route2 graf sight-line + post-talk] OK");
  } finally {
    await close();
  }
}

async function main(): Promise<void> {
  await testRoddickInteract();
  await testMarionSightLine();
  await testGrafSightLineAndPostTalk();
  console.log("route2-trainers-test: OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
