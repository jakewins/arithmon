/**
 * Route 2 wild-encounter port smoke test (STORY-0219).
 *
 * Verifies the 33 grass-tile random-battle rects + day/night-aware encounter
 * table ported verbatim from upstream's TMX + `db/encounter/spyder_route2.yaml`.
 *
 * Coverage:
 *   1. Walking onto a grass random-battle tile with the per-step probability
 *      forced to always fire produces a `random_encounter` action that
 *      launches CombatScene with one of the 5 route2 species at a level
 *      inside the daytime range.
 *   2. With `timeStage=night`, the species/level still falls inside the
 *      nighttime range (aardorn / eyenemy / axolightl / cataspike all bump
 *      levels; cardiling keeps the same range).
 *   3. Walking a non-grass dirt-road tile does NOT fire an encounter even
 *      with the force flag set — the rect just isn't there.
 *
 * The deterministic short-circuit lives on a single `random_encounter` debug
 * flag (`setForceEncounterRoll`). Monkey-patching `Math.random` globally was
 * tempting but breaks crypto/UUID code paths used by `MathProblemScene`
 * during CombatScene init, polluting browser-error capture.
 */
import {
  launchGame,
  setupGame,
  setTimeStage,
  waitForIdle,
  getState,
  getEvents,
  walkStep,
  screenshot,
} from "./harness";
import type { Page } from "@playwright/test";

interface EncounterStarted {
  monster: string;
  level: number;
}

interface PlayerStateSnap {
  scene?: string;
  mapKey?: string;
  player?: { tileX: number; tileY: number; facing: string };
}

const ROUTE2_SPECIES = new Set(["cardiling", "aardorn", "eyenemy", "axolightl", "cataspike"]);

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

/** Toggle the `random_encounter` debug-force flag in-page. */
async function setForceEncounterRoll(page: Page, on: boolean): Promise<void> {
  await page.evaluate((v) => window.A!.setForceEncounterRoll(v), on);
}

/** Wait for an `encounter_started` debug event, returning its data. */
async function waitForEncounter(
  page: Page,
  timeoutMs = 5_000,
): Promise<EncounterStarted | undefined> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const events = await getEvents(page);
    const ev = events.find((e) => e.type === "encounter_started");
    if (ev) return ev.data as unknown as EncounterStarted;
    await page.waitForTimeout(120);
  }
  return undefined;
}

/** Wait until CombatScene has booted past its scene-launch race window. */
async function waitForCombatSettled(page: Page, timeoutMs = 10_000): Promise<void> {
  await page.waitForFunction(
    () => {
      const s = window.A!.getState() as { combat?: { menuMode?: string } };
      return s.combat?.menuMode === "main";
    },
    null,
    { timeout: timeoutMs },
  );
}

/** Test 1: grass-tile walk with forced roll → encounter fires (daytime). */
async function testGrassEncounterDay(): Promise<void> {
  console.log("[route2 encounters: day] launching...");
  const { page, close } = await launchGame();
  try {
    // Spawn one tile west of `random battle32` (single tile at x=33, y=16).
    // The southeastern road strip stays clear of every trainer sight rect
    // (Roddick x=5 y=4..8, Marion x=22 y=10..13, Graf x=29 y=4..8). The
    // first walkStep east lands the player inside the grass rect and fires
    // the encounter.
    await setupGame(page, { map: "spyder_route2", tileX: 32, tileY: 16 });
    await setTimeStage(page, "day");
    await waitForIdle(page);

    await setForceEncounterRoll(page, true);

    const pos = await walkStep(page, "right");
    assert(
      pos.tileX === 33 && pos.tileY === 16,
      `expected step into (33,16), landed at (${pos.tileX},${pos.tileY})`,
    );

    const enc = await waitForEncounter(page);
    assert(enc !== undefined, "expected encounter_started after stepping into grass");
    assert(ROUTE2_SPECIES.has(enc!.monster), `expected route2 species, got ${enc!.monster}`);

    // Daytime rows max out at level 7 (axolightl day high), so any daytime
    // species must land in [3, 7].
    assert(
      enc!.level >= 3 && enc!.level <= 7,
      `expected daytime level in [3,7], got ${enc!.level}`,
    );

    await waitForCombatSettled(page);
    await screenshot(page, "route2-encounter-day");
    await setForceEncounterRoll(page, false);
    console.log(`[route2 encounters: day] OK (${enc!.monster} L${enc!.level})`);
  } finally {
    await close();
  }
}

/** Test 2: at night, encounters draw from the night-tagged rows. */
async function testGrassEncounterNight(): Promise<void> {
  console.log("[route2 encounters: night] launching...");
  const { page, close } = await launchGame();
  try {
    await setupGame(page, { map: "spyder_route2", tileX: 32, tileY: 16 });
    await setTimeStage(page, "night");
    await waitForIdle(page);

    await setForceEncounterRoll(page, true);

    const pos = await walkStep(page, "right");
    assert(
      pos.tileX === 33 && pos.tileY === 16,
      `expected step into (33,16), landed at (${pos.tileX},${pos.tileY})`,
    );

    const enc = await waitForEncounter(page);
    assert(enc !== undefined, "expected encounter_started after stepping into grass at night");
    assert(
      ROUTE2_SPECIES.has(enc!.monster),
      `expected route2 species at night, got ${enc!.monster}`,
    );

    // Nighttime range across all species: cardiling 3..6, others 4..8.
    assert(
      enc!.level >= 3 && enc!.level <= 8,
      `expected nighttime level in [3,8], got ${enc!.level}`,
    );
    if (enc!.monster !== "cardiling") {
      assert(
        enc!.level >= 4,
        `expected non-cardiling night level ≥4, got ${enc!.monster} L${enc!.level}`,
      );
    }

    await waitForCombatSettled(page);
    await screenshot(page, "route2-encounter-night");
    await setForceEncounterRoll(page, false);
    console.log(`[route2 encounters: night] OK (${enc!.monster} L${enc!.level})`);
  } finally {
    await close();
  }
}

/** Test 3: walking a non-grass dirt-road tile must NOT trigger an encounter. */
async function testSafePathNoEncounter(): Promise<void> {
  console.log("[route2 encounters: safe path] launching...");
  const { page, close } = await launchGame();
  try {
    // (32, 15) is a dirt-road tile north of `random battle32` (33, 16) and
    // not inside any random-battle rect. Walking east along row 15 stays
    // outside every grass rect (battle22/35 are at y=11/8..9; battle34/35
    // top out at y=9).
    await setupGame(page, { map: "spyder_route2", tileX: 32, tileY: 15 });
    await waitForIdle(page);

    await setForceEncounterRoll(page, true); // would-fire if a rect was hit

    await walkStep(page, "right");
    await page.waitForTimeout(200);
    await walkStep(page, "right");
    await page.waitForTimeout(400);

    const events = await getEvents(page);
    const fired = events.filter((e) => e.type === "encounter_started");
    assert(
      fired.length === 0,
      `expected no encounters on dirt road, got ${fired.length}: ${JSON.stringify(fired)}`,
    );

    // Still on OverworldScene — no combat launched.
    const snap = (await getState(page)) as PlayerStateSnap;
    assert(
      snap.scene === "OverworldScene",
      `expected to stay on OverworldScene, got ${snap.scene}`,
    );

    await screenshot(page, "route2-safe-path");
    await setForceEncounterRoll(page, false);
    console.log("[route2 encounters: safe path] OK");
  } finally {
    await close();
  }
}

async function main(): Promise<void> {
  await testGrassEncounterDay();
  await testGrassEncounterNight();
  await testSafePathNoEncounter();
  console.log("route2-encounters-test: OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
