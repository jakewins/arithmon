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

/** Walk north off route2 (10, 0) into citypark. STORY-0223 ported citypark's
 *  full 40x40 shell, so the player now lands cleanly on (10, 39) facing up. */
async function testNorthToCitypark(): Promise<void> {
  console.log("[route2 north to citypark] launching...");
  const { page, close } = await launchGame();
  try {
    await setupGame(page, { map: "spyder_route2", tileX: 10, tileY: 1 });
    await waitForIdle(page);
    walkTo(page, 10, 0, "up").catch(() => undefined);
    await waitForMap(page, "spyder_citypark");

    const s = (await getState(page)) as PlayerState;
    assert(
      s.player?.tileX === 10 && s.player?.tileY === 39,
      `expected citypark (10,39), got (${s.player?.tileX},${s.player?.tileY})`,
    );
    assert(s.player?.facing === "up", `expected facing up, got ${s.player?.facing}`);

    await screenshot(page, "route2-exit-to-citypark");
    console.log("[route2 north to citypark] OK");
  } finally {
    await close();
  }
}

/** Walk south off citypark (10, 39) back into route2 (10, 0) — round-trip
 *  through the upstream south-edge teleport. STORY-0223 replaced the
 *  fabricated west-edge triggers with the verbatim upstream south-edge ones
 *  at (10, 39)/(11, 39). */
async function testCityparkRoute2RoundTrip(): Promise<void> {
  console.log("[citypark south -> route2 round-trip] launching...");
  const { page, close } = await launchGame();
  try {
    // Spawn one tile north of the teleport so we walk south onto it facing
    // down (matches the upstream condition `is char_facing player,down`).
    await setupGame(page, { map: "spyder_citypark", tileX: 10, tileY: 38 });
    await waitForIdle(page);
    walkTo(page, 10, 39, "down").catch(() => undefined);
    await waitForMap(page, "spyder_route2");

    const s = (await getState(page)) as PlayerState;
    assert(
      s.player?.tileX === 10 && s.player?.tileY === 0,
      `expected route2 (10,0), got (${s.player?.tileX},${s.player?.tileY})`,
    );

    console.log("[citypark south -> route2 round-trip] OK");
  } finally {
    await close();
  }
}

/** Spawn on a safe tile in the centre of route2 and verify the map settles —
 *  no battle starts, no scripted cutscene grabs the engine, and we stay on
 *  route2. The trainers added in STORY-0218 (Roddick, Marion, Graf) DO spawn
 *  via on-map `create_npc` events, so we just sanity-check that they're the
 *  only NPCs present and that none of them sight-lined the player. */
async function testNoEncountersOrNpcs(): Promise<void> {
  console.log("[route2 quiescence: no battle, no cutscene] launching...");
  const { page, close } = await launchGame();
  try {
    // Spawn in open grass mid-map — away from Billie's trigger column at x=1
    // (STORY-0221) *and* away from the trainer sight-lines Roddick (x=5),
    // Marion (x=22), and Graf (x=29) added in STORY-0218. Setting
    // `route2billie:yes` keeps us consistent with the other cases in this
    // file even though our spawn is already clear of the Billie trigger.
    await setupGame(page, {
      map: "spyder_route2",
      tileX: 15,
      tileY: 12,
      variables: { route2billie: "yes" },
    });
    await waitForIdle(page);

    const s = (await getState(page)) as PlayerState;
    const npcs = s.npcs ?? [];
    const expected = ["spyder_route2_roddick", "spyder_route2_marion", "spyder_route2_graf"];
    const slugs = npcs.map((n) => n.slug).sort();
    assert(
      slugs.length === expected.length && expected.every((slug) => slugs.includes(slug)),
      `expected route2 trainers [${expected.join(",")}], got ${JSON.stringify(slugs)}`,
    );
    assert(s.scene !== "BattleScene", `expected to remain in OverworldScene, got scene=${s.scene}`);
    assert(s.mapKey === "spyder_route2", `expected to still be on route2, got mapKey=${s.mapKey}`);

    console.log("[route2 quiescence: no battle, no cutscene] OK");
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
  await testCityparkRoute2RoundTrip();
  await testNoEncountersOrNpcs();
  console.log("cotton-town-east-road-test: OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
