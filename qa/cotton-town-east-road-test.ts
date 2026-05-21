/**
 * Cotton Town east-road / spyder_route2 verbatim-port smoke test (STORY-0217).
 *
 * spyder_route2 is a 40x20 transit route that connects Cotton Town (west),
 * City Park (north) and Brideswood (south). This story ports only the map
 * shell + the 6 edge teleports + the music event — trainers, signs, random
 * encounters and the Billie cutscene are deferred. This test exercises the
 * wired-up connections only.
 *
 * Coverage:
 *   1. Map sanity (40x20, slug, 5 tile layers, 3 tilesets, Collisions present).
 *   2. cotton_town east exits (39, 28)/(39, 29) -> route2 (0, 8)/(0, 9).
 *      Hacker gate at (38, 28-29) is bypassed via `visitedcottoncafe:yes` —
 *      we don't weaken the gate condition itself.
 *   3. route2 west round-trip back to cotton_town.
 *   4. route2 south (36, 19)/(37, 19) -> brideswood (36, 0)/(37, 0) + return.
 *   5. route2 north (10, 0)/(11, 0) -> citypark (10, 39)/(11, 39).
 *      Citypark return trip exercises the in-flight citypark teleport-target
 *      fix (was 26,10/26,11; now 10,0/11,0).
 *   6. No NPCs spawn and no BattleScene starts when walking grass tiles.
 */
import {
  launchGame,
  setupGame,
  walkTo,
  waitForIdle,
  getState,
  getEvents,
  screenshot,
  setVariable,
} from "./harness";
import type { Page } from "@playwright/test";

interface PlayerState {
  mapKey?: string;
  player?: { tileX: number; tileY: number; facing: string };
  scene?: string;
  npcs?: { slug: string }[];
}

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

/** Poll until the active map matches `mapKey`. */
async function waitForMap(page: Page, mapKey: string, timeoutMs = 7000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const s = (await page.evaluate(() => window.A!.getState())) as PlayerState;
    if (s.mapKey === mapKey) return;
    await page.waitForTimeout(120);
  }
  throw new Error(`Timed out waiting for mapKey=${mapKey}`);
}

async function testMapSanity(): Promise<void> {
  console.log("[route2 sanity] launching...");
  const { page, close } = await launchGame();
  try {
    // Pre-set `route2billie:yes` so the STORY-0221 Billie encounter at
    // (1,8)-(1,9) doesn't intercept this map-transition / sanity test.
    await setupGame(page, {
      map: "spyder_route2",
      tileX: 1,
      tileY: 8,
      variables: { route2billie: "yes" },
    });
    await waitForIdle(page);

    const meta = (await page.evaluate(async () => {
      const r = await fetch("/assets/maps/spyder_route2.json");
      const m = (await r.json()) as {
        width: number;
        height: number;
        tilewidth: number;
        properties?: { name: string; value: unknown }[];
        layers: { name: string; type: string }[];
        tilesets: { name: string; firstgid: number }[];
      };
      return {
        width: m.width,
        height: m.height,
        tilewidth: m.tilewidth,
        slug: m.properties?.find((p) => p.name === "slug")?.value,
        layerNames: m.layers.map((l) => l.name),
        tilesets: m.tilesets.map((t) => ({ name: t.name, firstgid: t.firstgid })),
      };
    })) as {
      width: number;
      height: number;
      tilewidth: number;
      slug?: string;
      layerNames: string[];
      tilesets: { name: string; firstgid: number }[];
    };

    assert(
      meta.width === 40 && meta.height === 20,
      `expected 40x20, got ${meta.width}x${meta.height}`,
    );
    assert(meta.tilewidth === 16, `expected tilewidth=16, got ${meta.tilewidth}`);
    assert(meta.slug === "route2", `expected slug "route2", got "${String(meta.slug)}"`);

    // route2's TMX uses "Layer 1..4" (no "Tile" prefix) — that's upstream's
    // older naming. Verify all 5 tile layers + Collisions are present.
    for (const want of ["Layer 1", "Layer 2", "Layer 3", "Layer 4", "Above Player"]) {
      assert(
        meta.layerNames.includes(want),
        `expected layer "${want}", got ${meta.layerNames.join(",")}`,
      );
    }
    assert(
      meta.layerNames.includes("Collisions"),
      `expected Collisions objectgroup, got ${meta.layerNames.join(",")}`,
    );
    assert(
      !meta.layerNames.includes("Events"),
      `expected Events objectgroup stripped (events live in YAML), got ${meta.layerNames.join(",")}`,
    );

    // 3 tilesets, exact firstgids from upstream TMX.
    const want = [
      { name: "core_outdoor", firstgid: 1 },
      { name: "core_set pieces", firstgid: 2776 },
      { name: "core_outdoor_nature", firstgid: 4326 },
    ];
    assert(
      meta.tilesets.length === 3,
      `expected 3 tilesets, got ${meta.tilesets.length}: ${JSON.stringify(meta.tilesets)}`,
    );
    for (const w of want) {
      const got = meta.tilesets.find((t) => t.name === w.name);
      assert(
        got !== undefined && got.firstgid === w.firstgid,
        `expected tileset ${w.name} firstgid=${w.firstgid}, got ${JSON.stringify(got)}`,
      );
    }

    console.log("[route2 sanity] OK");
  } finally {
    await close();
  }
}

/** Walk east off cotton_town onto the route2-bound tile. */
async function testEastFromCottonTown(tileY: number, expectRoute2Y: number): Promise<void> {
  console.log(`[cotton_town east (39,${tileY})] launching...`);
  const { page, close } = await launchGame();
  try {
    // Stand one tile west of the teleport trigger. Set `visitedcottoncafe:yes`
    // BEFORE the route2 step so the "Stop Cotton" hacker gate at (38, 28-29)
    // doesn't fire — story explicitly says: don't weaken the gate, just skip
    // it from QA via the same flag the cafe cutscene sets.
    await setupGame(page, { map: "spyder_cotton_town", tileX: 37, tileY });
    await setVariable(page, "visitedcottoncafe", "yes");
    await waitForIdle(page);
    // Walk east through (38, tileY) — the gate — then onto (39, tileY) — the
    // teleport. waitForMap below handles the actual map change.
    walkTo(page, 39, tileY, "right").catch(() => undefined);
    await waitForMap(page, "spyder_route2");

    const s = (await getState(page)) as PlayerState;
    assert(
      s.player?.tileX === 0 && s.player?.tileY === expectRoute2Y,
      `expected route2 (0,${expectRoute2Y}), got (${s.player?.tileX},${s.player?.tileY})`,
    );
    // cotton_town's outbound teleport sets `char_face player,right` to keep
    // forward momentum onto route2 — see spyder_cotton_town.yaml "Go Route 2".
    assert(
      s.player?.facing === "right",
      `expected facing right after cotton_town transition tail char_face, got ${s.player?.facing}`,
    );

    if (tileY === 28) {
      await screenshot(page, "route2-entry-from-cotton-town");
    }
    console.log(`[cotton_town east (39,${tileY})] OK`);
  } finally {
    await close();
  }
}

/** Walk west off route2 back into cotton_town. */
async function testWestBackToCottonTown(): Promise<void> {
  console.log("[route2 west back to cotton_town] launching...");
  const { page, close } = await launchGame();
  try {
    // Pre-set `route2billie:yes` so the STORY-0221 Billie encounter at
    // (1,8)-(1,9) doesn't intercept this map-transition / sanity test.
    await setupGame(page, {
      map: "spyder_route2",
      tileX: 1,
      tileY: 8,
      variables: { route2billie: "yes" },
    });
    await waitForIdle(page);
    walkTo(page, 0, 8, "left").catch(() => undefined);
    await waitForMap(page, "spyder_cotton_town");

    const s = (await getState(page)) as PlayerState;
    assert(
      s.player?.tileX === 39 && s.player?.tileY === 28,
      `expected cotton_town (39,28), got (${s.player?.tileX},${s.player?.tileY})`,
    );
    assert(s.player?.facing === "left", `expected facing left, got ${s.player?.facing}`);

    console.log("[route2 west back to cotton_town] OK");
  } finally {
    await close();
  }
}

/** Validate the south teleport at route2 (37, 19) lands on brideswood (37, 0).
 *  Note: the upstream tile layout means (36..37, 18) are fully blocked (fence
 *  sprites) — the player cannot walk south onto the teleport tile facing
 *  down via normal pathing. Upstream gameplay only ever uses these tiles as
 *  inbound destinations from brideswood, where `char_face player,up` is
 *  applied so the route2→brideswood teleport doesn't immediately fire back.
 *  We exercise the outbound wiring by directly spawning the player on the
 *  teleport tile facing down (setupGame's default facing) — the event ticks
 *  once and the teleport fires, proving the YAML destination is correct. */
async function testSouthToBrideswood(): Promise<void> {
  console.log("[route2 south to brideswood] launching...");
  const { page, close } = await launchGame();
  try {
    await setupGame(page, { map: "spyder_route2", tileX: 37, tileY: 19 });
    await waitForMap(page, "spyder_brideswood");

    const s = (await getState(page)) as PlayerState;
    assert(
      s.player?.tileX === 37 && s.player?.tileY === 0,
      `expected brideswood (37,0), got (${s.player?.tileX},${s.player?.tileY})`,
    );
    assert(s.player?.facing === "down", `expected facing down, got ${s.player?.facing}`);

    await screenshot(page, "route2-exit-to-brideswood");
    console.log("[route2 south to brideswood] OK");
  } finally {
    await close();
  }
}

/** Walk north off brideswood (36, 0) back into route2 (36, 19) — round-trip. */
async function testBrideswoodNorthReturn(): Promise<void> {
  console.log("[brideswood north return to route2] launching...");
  const { page, close } = await launchGame();
  try {
    await setupGame(page, { map: "spyder_brideswood", tileX: 36, tileY: 1 });
    await waitForIdle(page);
    walkTo(page, 36, 0, "up").catch(() => undefined);
    await waitForMap(page, "spyder_route2");

    const s = (await getState(page)) as PlayerState;
    assert(
      s.player?.tileX === 36 && s.player?.tileY === 19,
      `expected route2 (36,19), got (${s.player?.tileX},${s.player?.tileY})`,
    );
    assert(s.player?.facing === "up", `expected facing up, got ${s.player?.facing}`);

    console.log("[brideswood north return to route2] OK");
  } finally {
    await close();
  }
}

/** Walk north off route2 (10, 0) into citypark.
 *  citypark is still the fabricated stub map (25 tiles tall), so the engine
 *  clamps the requested spawn y=39 to in-bounds — we assert the *intended*
 *  destination from the teleport debug event and only sanity-check that the
 *  player ended up on the citypark map. STORY-021F (citypark verbatim port)
 *  will let us assert the exact landing tile. */
async function testNorthToCitypark(): Promise<void> {
  console.log("[route2 north to citypark] launching...");
  const { page, close } = await launchGame();
  try {
    await setupGame(page, { map: "spyder_route2", tileX: 10, tileY: 1 });
    await waitForIdle(page);
    // Clear prior debug events so we only see this teleport.
    await page.evaluate(() => window.A!.clearEvents());
    walkTo(page, 10, 0, "up").catch(() => undefined);
    await waitForMap(page, "spyder_citypark");

    const evs = await getEvents(page);
    const tele = evs.find(
      (e) => e.type === "teleport" && (e.data as { map?: string }).map === "spyder_citypark",
    );
    const teleData = tele?.data as { x?: number; y?: number } | undefined;
    assert(
      tele !== undefined && teleData?.x === 10 && teleData?.y === 39,
      `expected teleport debug event to citypark (10,39), got ${JSON.stringify(tele)}`,
    );

    const s = (await getState(page)) as PlayerState;
    assert(s.player?.facing === "up", `expected facing up, got ${s.player?.facing}`);

    await screenshot(page, "route2-exit-to-citypark");
    console.log("[route2 north to citypark] OK");
  } finally {
    await close();
  }
}

/** Walk west off citypark (0, 11) back into route2 (10, 0) — round-trip that
 *  exercises the in-flight citypark teleport-target fix. The citypark side
 *  uses a fabricated west-edge trigger at (0, 11)/(0, 12) facing left; only
 *  the destination was corrected this story (26,10/26,11 -> 10,0/11,0).
 *  The full citypark port (STORY-021F) will replace the fabricated triggers
 *  with the upstream south-edge ones. */
async function testCityparkRoute2DestinationFix(): Promise<void> {
  console.log("[citypark west -> route2 destination fix] launching...");
  const { page, close } = await launchGame();
  try {
    await setupGame(page, { map: "spyder_citypark", tileX: 1, tileY: 11 });
    await waitForIdle(page);
    walkTo(page, 0, 11, "left").catch(() => undefined);
    await waitForMap(page, "spyder_route2");

    const s = (await getState(page)) as PlayerState;
    assert(
      s.player?.tileX === 10 && s.player?.tileY === 0,
      `expected route2 (10,0) after destination fix, got (${s.player?.tileX},${s.player?.tileY})`,
    );

    console.log("[citypark west -> route2 destination fix] OK");
  } finally {
    await close();
  }
}

/** Walk a few tiles on route2 and verify no NPCs spawn and no battle starts. */
async function testNoEncountersOrNpcs(): Promise<void> {
  console.log("[route2 quiescence: no NPCs, no encounters] launching...");
  const { page, close } = await launchGame();
  try {
    await setupGame(page, { map: "spyder_route2", tileX: 5, tileY: 8 });
    await waitForIdle(page);

    // Take a short walk through what would be encounter-zone tiles upstream.
    // This story intentionally ships none of those triggers.
    await walkTo(page, 8, 8, "right").catch(() => undefined);
    await walkTo(page, 8, 12, "down").catch(() => undefined);
    await walkTo(page, 5, 12, "left").catch(() => undefined);
    await waitForIdle(page);

    const s = (await getState(page)) as PlayerState;
    const npcs = s.npcs ?? [];
    assert(npcs.length === 0, `expected zero NPCs on route2, got ${JSON.stringify(npcs)}`);
    assert(s.scene !== "BattleScene", `expected to remain in OverworldScene, got scene=${s.scene}`);
    assert(s.mapKey === "spyder_route2", `expected to still be on route2, got mapKey=${s.mapKey}`);

    console.log("[route2 quiescence: no NPCs, no encounters] OK");
  } finally {
    await close();
  }
}

async function main(): Promise<void> {
  await testMapSanity();
  await testEastFromCottonTown(28, 8);
  await testEastFromCottonTown(29, 9);
  await testWestBackToCottonTown();
  await testSouthToBrideswood();
  await testBrideswoodNorthReturn();
  await testNorthToCitypark();
  await testCityparkRoute2DestinationFix();
  await testNoEncountersOrNpcs();
  console.log("cotton-town-east-road-test: OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
