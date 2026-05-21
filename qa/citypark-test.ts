/**
 * spyder_citypark verbatim-port smoke test (STORY-0223).
 *
 * spyder_citypark is a 40x40 route that connects spyder_route2 (south),
 * spyder_leather_town (west) and spyder_citypark_house1 (east — Maniac
 * House door). This story ports only the map shell + collisions + the 7
 * shell-scope events (1 music + 5 edge teleports + 1 maniac-house door).
 * Trainers, ~30 encounter rects, PC boxes, signs, env day/night events and
 * sight-line variants are deferred to follow-up stories.
 *
 * Coverage:
 *   1. Map sanity (40x40, slug, 4 tile layers + Collisions, 5 tilesets,
 *      no Events objectgroup in JSON).
 *   2. route2 (10, 1) -> citypark (10, 39) — entry. Screenshot.
 *   3. South round-trip: citypark (10, 39) facing down -> route2 (10, 0).
 *   4. West to leather_town: citypark (1, 12) walking left fires the
 *      teleport (debug event proves the YAML wiring). Leather_town is still
 *      a 35x25 stub so the actual landing is out-of-bounds — documented.
 *   5. Maniac House (best-effort): citypark (36, 4) walking up. Target
 *      spyder_citypark_house1 isn't ported, so the engine logs "target map
 *      not in MAP_REGISTRY" and the player stays on citypark. No crash.
 *   6. No NPCs spawn on the freshly-ported map (no `create_npc` events yet).
 *   7. No wild encounters: walk a small loop in the centre, no BattleScene.
 */
import {
  launchGame,
  setupGame,
  walkTo,
  waitForIdle,
  getState,
  getEvents,
  screenshot,
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
  console.log("[citypark sanity] launching...");
  const { page, close } = await launchGame();
  try {
    await setupGame(page, { map: "spyder_citypark", tileX: 20, tileY: 20 });
    await waitForIdle(page);

    const meta = (await page.evaluate(async () => {
      const r = await fetch("/assets/maps/spyder_citypark.json");
      const m = (await r.json()) as {
        width: number;
        height: number;
        tilewidth: number;
        properties?: { name: string; value: unknown }[];
        layers: { name: string; type: string }[];
        tilesets: { name: string }[];
      };
      return {
        width: m.width,
        height: m.height,
        tilewidth: m.tilewidth,
        slug: m.properties?.find((p) => p.name === "slug")?.value,
        layerNames: m.layers.map((l) => l.name),
        tilesetNames: m.tilesets.map((t) => t.name),
      };
    })) as {
      width: number;
      height: number;
      tilewidth: number;
      slug?: string;
      layerNames: string[];
      tilesetNames: string[];
    };

    assert(
      meta.width === 40 && meta.height === 40,
      `expected 40x40, got ${meta.width}x${meta.height}`,
    );
    assert(meta.tilewidth === 16, `expected tilewidth=16, got ${meta.tilewidth}`);
    assert(meta.slug === "citypark", `expected slug "citypark", got "${String(meta.slug)}"`);

    // Verbatim port from upstream TMX: 4 tile layers + Collisions, no Events
    // (events live in the YAML).
    for (const want of ["Tile Layer 1", "Tile Layer 2", "Tile Layer 3", "Above Player"]) {
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
      `expected Events objectgroup stripped, got ${meta.layerNames.join(",")}`,
    );

    // 5 tilesets matching upstream — names checked, firstgids deliberately
    // not asserted because Tiled's --embed-tilesets re-packs them. Phaser
    // matches by name + the layer data is rewritten consistently.
    const wantNames = [
      "Superpowers_Tilesheet",
      "core_outdoor",
      "core_buildings",
      "core_set pieces",
      "core_outdoor_nature",
    ];
    assert(
      meta.tilesetNames.length === wantNames.length,
      `expected ${wantNames.length} tilesets, got ${meta.tilesetNames.length}: ${JSON.stringify(meta.tilesetNames)}`,
    );
    for (const name of wantNames) {
      assert(
        meta.tilesetNames.includes(name),
        `expected tileset "${name}", got ${meta.tilesetNames.join(",")}`,
      );
    }

    console.log("[citypark sanity] OK");
  } finally {
    await close();
  }
}

/** Walk north off route2 (10, 1) into citypark (10, 39). */
async function testEntryFromRoute2(): Promise<void> {
  console.log("[route2 north -> citypark] launching...");
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

    await screenshot(page, "citypark-entry-from-route2");
    console.log("[route2 north -> citypark] OK");
  } finally {
    await close();
  }
}

/** Walk south off citypark (10, 39) back into route2 (10, 0). */
async function testSouthRoundTrip(): Promise<void> {
  console.log("[citypark south -> route2] launching...");
  const { page, close } = await launchGame();
  try {
    // Spawn one tile north of the south-edge teleport so we walk onto it
    // facing down, matching the upstream condition.
    await setupGame(page, { map: "spyder_citypark", tileX: 10, tileY: 38 });
    await waitForIdle(page);
    walkTo(page, 10, 39, "down").catch(() => undefined);
    await waitForMap(page, "spyder_route2");

    const s = (await getState(page)) as PlayerState;
    assert(
      s.player?.tileX === 10 && s.player?.tileY === 0,
      `expected route2 (10,0), got (${s.player?.tileX},${s.player?.tileY})`,
    );
    assert(s.player?.facing === "down", `expected facing down, got ${s.player?.facing}`);

    console.log("[citypark south -> route2] OK");
  } finally {
    await close();
  }
}

/** Walk west off citypark (1, 12) towards leather_town. Our leather_town is
 *  still a fabricated 35x25 stub, so the destination tile (39, 32) is
 *  out-of-bounds. We assert the teleport debug event fires with the upstream
 *  destination — proves the YAML wiring is correct — and don't pin behaviour
 *  after the teleport (handled by the follow-up leather_town port story). */
async function testWestToLeatherTown(): Promise<void> {
  console.log("[citypark west -> leather_town] launching...");
  const { page, close } = await launchGame();
  try {
    await setupGame(page, { map: "spyder_citypark", tileX: 1, tileY: 12 });
    await waitForIdle(page);
    await page.evaluate(() => window.A!.clearEvents());
    walkTo(page, 0, 12, "left").catch(() => undefined);
    // Give the engine a beat to fire the teleport event, then check the
    // debug log instead of waiting for a (clamped, potentially-bad) map state.
    await page.waitForTimeout(800);

    const evs = await getEvents(page);
    const tele = evs.find(
      (e) => e.type === "teleport" && (e.data as { map?: string }).map === "spyder_leather_town",
    );
    const teleData = tele?.data as { x?: number; y?: number } | undefined;
    assert(
      tele !== undefined && teleData?.x === 39 && teleData?.y === 32,
      `expected teleport debug event to leather_town (39,32), got ${JSON.stringify(tele)}`,
    );

    await screenshot(page, "citypark-exit-to-leather-town");
    console.log("[citypark west -> leather_town] OK");
  } finally {
    await close();
  }
}

/** Walk north off citypark (36, 4) onto the Maniac House door at (36, 3).
 *  Target map spyder_citypark_house1 isn't registered yet — the engine logs
 *  "target map not in MAP_REGISTRY" and the player stays put. Acceptance:
 *  no crash, player still on citypark, scene still OverworldScene. */
async function testManiacHouseDoor(): Promise<void> {
  console.log("[citypark maniac house door] launching...");
  const { page, close } = await launchGame();
  try {
    await setupGame(page, { map: "spyder_citypark", tileX: 36, tileY: 4 });
    await waitForIdle(page);
    walkTo(page, 36, 3, "up").catch(() => undefined);
    // No map change expected — just give the event engine time to evaluate
    // the teleport and emit its log line.
    await page.waitForTimeout(800);

    const s = (await getState(page)) as PlayerState;
    assert(
      s.mapKey === "spyder_citypark",
      `expected to stay on citypark (target map unported), got mapKey=${s.mapKey}`,
    );
    assert(s.scene === "OverworldScene", `expected OverworldScene, got scene=${s.scene}`);

    console.log("[citypark maniac house door] OK (target unported, engine stayed put)");
  } finally {
    await close();
  }
}

/** No NPCs are registered for citypark in this shell-only port, and no
 *  encounter rects either. Spawn in open ground, take a small walk, assert
 *  no NPCs spawned via on-map events and no BattleScene started. */
async function testNoNpcsOrEncounters(): Promise<void> {
  console.log("[citypark quiescence: no npcs, no battle] launching...");
  const { page, close } = await launchGame();
  try {
    // Centre of the map — well away from every edge teleport trigger.
    await setupGame(page, { map: "spyder_citypark", tileX: 18, tileY: 20 });
    await waitForIdle(page);

    const before = (await getState(page)) as PlayerState;
    assert(
      (before.npcs ?? []).length === 0,
      `expected no NPCs on citypark, got ${JSON.stringify(before.npcs)}`,
    );

    // Walk a small square. If a wild encounter rect were still wired, this
    // would trip it; if any sight-line / "create_npc" event were still
    // present, we'd see the NPC list grow.
    await walkTo(page, 19, 20, "right").catch(() => undefined);
    await walkTo(page, 19, 21, "down").catch(() => undefined);
    await walkTo(page, 18, 21, "left").catch(() => undefined);
    await walkTo(page, 18, 20, "up").catch(() => undefined);
    await waitForIdle(page);

    const after = (await getState(page)) as PlayerState;
    assert(
      after.scene === "OverworldScene",
      `expected to stay on OverworldScene, got scene=${after.scene}`,
    );
    assert(
      after.mapKey === "spyder_citypark",
      `expected to stay on citypark, got mapKey=${after.mapKey}`,
    );
    assert(
      (after.npcs ?? []).length === 0,
      `expected no NPCs after walking, got ${JSON.stringify(after.npcs)}`,
    );

    console.log("[citypark quiescence] OK");
  } finally {
    await close();
  }
}

async function main(): Promise<void> {
  await testMapSanity();
  await testEntryFromRoute2();
  await testSouthRoundTrip();
  await testWestToLeatherTown();
  await testManiacHouseDoor();
  await testNoNpcsOrEncounters();
  console.log("citypark-test: OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
