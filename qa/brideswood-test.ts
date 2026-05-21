/**
 * Brideswood verbatim-port smoke test (STORY-0216).
 *
 * spyder_brideswood is a small (40x40) transit route between Paper Town (west
 * exit), Route 1 (further west via brideswood's own west edge), and the
 * not-yet-ported Route 2 (north). This test exercises the wired-up
 * connections only — north-edge teleports lead to a garbled map until
 * Route 2 lands and are explicitly skipped here.
 *
 * Coverage:
 *   1. paper_town east exit (39, 6) -> brideswood (0, 26) facing left
 *   2. paper_town east exit (39, 7) -> brideswood (0, 27) facing left
 *   3. brideswood west-back (0, 26) -> paper_town (39, 6) facing left
 *   4. brideswood west to route1 (0, 4) -> route1 (39, 4) facing left
 *   5. route1 east return (39, 4) -> brideswood (0, 4) facing right
 *   6. Map sanity: dimensions, slug, layer names, tileset count.
 */
import { launchGame, setupGame, walkTo, waitForIdle, getState, screenshot } from "./harness";
import type { Page } from "@playwright/test";

interface PlayerState {
  mapKey?: string;
  player?: { tileX: number; tileY: number; facing: string };
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
  console.log("[brideswood sanity] launching...");
  const { page, close } = await launchGame();
  try {
    await setupGame(page, { map: "spyder_brideswood", tileX: 1, tileY: 26 });
    await waitForIdle(page);

    const meta = (await page.evaluate(async () => {
      const r = await fetch("/assets/maps/spyder_brideswood.json");
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
      meta.width === 40 && meta.height === 40,
      `expected 40x40, got ${meta.width}x${meta.height}`,
    );
    assert(meta.tilewidth === 16, `expected tilewidth=16, got ${meta.tilewidth}`);
    assert(meta.slug === "brideswood", `expected slug "brideswood", got "${String(meta.slug)}"`);
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
      meta.tilesets.length === 1 &&
        meta.tilesets[0].name === "core_outdoor" &&
        meta.tilesets[0].firstgid === 1,
      `expected single core_outdoor tileset firstgid=1, got ${JSON.stringify(meta.tilesets)}`,
    );

    console.log("[brideswood sanity] OK");
  } finally {
    await close();
  }
}

/** Walk east off paper_town onto the brideswood-bound tile. */
async function testEastFromPaperTown(tileY: number, expectBrideswoodY: number): Promise<void> {
  console.log(`[paper_town east (39,${tileY})] launching...`);
  const { page, close } = await launchGame();
  try {
    // Stand one tile west of the teleport trigger and step east onto it.
    await setupGame(page, { map: "spyder_paper_town", tileX: 38, tileY });
    await waitForIdle(page);
    walkTo(page, 39, tileY, "right").catch(() => undefined);
    await waitForMap(page, "spyder_brideswood");

    const s = (await getState(page)) as PlayerState;
    assert(
      s.player?.tileX === 0 && s.player?.tileY === expectBrideswoodY,
      `expected brideswood (0,${expectBrideswoodY}), got (${s.player?.tileX},${s.player?.tileY})`,
    );
    // paper_town's outbound teleport sets `char_face player,right` (preserving
    // forward motion onto brideswood) — see upstream spyder_paper_town.tmx
    // "Teleport to Brideswood A/B".
    assert(
      s.player?.facing === "right",
      `expected facing right after paper_town transition tail char_face, got ${s.player?.facing}`,
    );

    if (tileY === 6) {
      await screenshot(page, "brideswood-entry-from-paper-town");
    }
    console.log(`[paper_town east (39,${tileY})] OK`);
  } finally {
    await close();
  }
}

/** Walk west off brideswood back into paper_town. */
async function testWestBackToPaperTown(): Promise<void> {
  console.log("[brideswood west back to paper_town] launching...");
  const { page, close } = await launchGame();
  try {
    await setupGame(page, { map: "spyder_brideswood", tileX: 1, tileY: 26 });
    await waitForIdle(page);
    walkTo(page, 0, 26, "left").catch(() => undefined);
    await waitForMap(page, "spyder_paper_town");

    const s = (await getState(page)) as PlayerState;
    assert(
      s.player?.tileX === 39 && s.player?.tileY === 6,
      `expected paper_town (39,6), got (${s.player?.tileX},${s.player?.tileY})`,
    );
    assert(s.player?.facing === "left", `expected facing left, got ${s.player?.facing}`);

    console.log("[brideswood west back to paper_town] OK");
  } finally {
    await close();
  }
}

/** Walk west off brideswood into route1 (via brideswood (0,4)). */
async function testWestToRoute1(): Promise<void> {
  console.log("[brideswood west to route1] launching...");
  const { page, close } = await launchGame();
  try {
    await setupGame(page, { map: "spyder_brideswood", tileX: 1, tileY: 4 });
    await waitForIdle(page);
    walkTo(page, 0, 4, "left").catch(() => undefined);
    await waitForMap(page, "spyder_route1");

    const s = (await getState(page)) as PlayerState;
    assert(
      s.player?.tileX === 39 && s.player?.tileY === 4,
      `expected route1 (39,4), got (${s.player?.tileX},${s.player?.tileY})`,
    );
    assert(s.player?.facing === "left", `expected facing left, got ${s.player?.facing}`);

    await screenshot(page, "brideswood-entry-from-route1");
    console.log("[brideswood west to route1] OK");
  } finally {
    await close();
  }
}

/** Walk east off route1 (39, 4) back into brideswood (0, 4) — round-trip via the
 *  in-flight route1 teleport we added in STORY-0216. */
async function testRoute1EastReturn(): Promise<void> {
  console.log("[route1 east return to brideswood] launching...");
  const { page, close } = await launchGame();
  try {
    await setupGame(page, { map: "spyder_route1", tileX: 38, tileY: 4 });
    await waitForIdle(page);
    walkTo(page, 39, 4, "right").catch(() => undefined);
    await waitForMap(page, "spyder_brideswood");

    const s = (await getState(page)) as PlayerState;
    assert(
      s.player?.tileX === 0 && s.player?.tileY === 4,
      `expected brideswood (0,4), got (${s.player?.tileX},${s.player?.tileY})`,
    );
    assert(s.player?.facing === "right", `expected facing right, got ${s.player?.facing}`);

    console.log("[route1 east return to brideswood] OK");
  } finally {
    await close();
  }
}

async function main(): Promise<void> {
  await testMapSanity();
  await testEastFromPaperTown(6, 26);
  await testEastFromPaperTown(7, 27);
  await testWestBackToPaperTown();
  await testWestToRoute1();
  await testRoute1EastReturn();
  console.log("brideswood-test: OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
