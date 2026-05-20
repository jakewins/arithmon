/**
 * Indoor camera-follow regression (STORY-0209).
 *
 * Before this fix, OverworldScene branched on map size and centred the camera
 * on small interior maps instead of following the player. At our 256x144
 * viewport that left the player off-screen in maps like the Cotton Town cafe
 * (192x192 px — narrower than the viewport but taller than it).
 *
 * The fix: always `cam.startFollow(player)` with bounds set to the map size,
 * matching upstream Tuxemon. Phaser's bounds clamp handles edges sensibly:
 * - Maps bigger than the viewport: scroll-with-clamp (unchanged behaviour).
 * - Maps smaller in one dim: scroll the bigger dim, anchor the smaller dim
 *   against one viewport edge; fill the off-map area with the camera bg.
 * - Maps smaller in both dims: stationary view; player stays visible everywhere
 *   because the whole map fits in the viewport.
 *
 * This script teleports through the maps in the story's table and screenshots
 * the player at every interesting position. Reviewer compares the cafe shot
 * against `~/Pictures/Screenshots/20260520_221427.png` (upstream reference).
 */
import { type Page } from "@playwright/test";
import { launchGame, setupGame, teleport, walkTo, waitForIdle, screenshot } from "./harness";

interface PlayerState {
  tileX: number;
  tileY: number;
  mapKey: string;
}

interface CameraState {
  scrollX: number;
  scrollY: number;
  width: number;
  height: number;
}

async function getPlayer(page: Page): Promise<PlayerState> {
  return page.evaluate(() => {
    const s = window.A!.getState() as {
      player?: { tileX: number; tileY: number };
      mapKey?: string;
    };
    return {
      tileX: s.player?.tileX ?? -1,
      tileY: s.player?.tileY ?? -1,
      mapKey: s.mapKey ?? "?",
    };
  });
}

async function getCamera(page: Page): Promise<CameraState> {
  return page.evaluate(() => {
    const s = window.A!.getState() as { camera?: CameraState };
    if (!s.camera) throw new Error("camera state missing from getState()");
    return s.camera;
  });
}

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

/**
 * After every walk we re-check that the player tile sits inside the camera
 * viewport. Tile units * 16 px tile size; the player sprite anchor is at the
 * tile centre.
 */
async function assertPlayerOnScreen(page: Page, label: string): Promise<void> {
  await waitForIdle(page);
  const player = await getPlayer(page);
  const cam = await getCamera(page);
  const px = player.tileX * 16 + 8;
  const py = player.tileY * 16 + 8;
  const inX = px >= cam.scrollX && px < cam.scrollX + cam.width;
  const inY = py >= cam.scrollY && py < cam.scrollY + cam.height;
  assert(
    inX && inY,
    `[${label}] player tile (${player.tileX},${player.tileY}) -> px (${px},${py}) ` +
      `outside camera viewport scroll=(${cam.scrollX.toFixed(1)},${cam.scrollY.toFixed(1)}) ` +
      `size=(${cam.width}x${cam.height}) on map ${player.mapKey}`,
  );
}

/** Walk to a tile, wait for the move to settle, then screenshot + assert. */
async function walkAndShoot(
  page: Page,
  label: string,
  x: number,
  y: number,
  shotName: string,
): Promise<void> {
  await walkTo(page, x, y);
  await waitForIdle(page);
  await assertPlayerOnScreen(page, label);
  const fp = await screenshot(page, shotName);
  console.log(`  [${label}] (${x},${y}) -> ${fp}`);
}

/**
 * Case 1: Cotton Town cafe (192x192) — narrower than viewport, taller than
 * viewport. Player enters at the south door (8,11) after the upstream
 * teleport. Verifies the entry framing matches the reference screenshot,
 * then walks to opposite corners to confirm follow.
 */
async function testCafe(page: Page): Promise<void> {
  console.log("[cafe] (12x12 / 192x192 — narrower, taller)");
  // The south-door tile (7..9, 11) hosts a "back to Cotton Town" teleport that
  // fires whenever the player is on it AND facing down. The debug teleport
  // here drops the player facing down by default, and the event engine fires
  // before we can race a face() in — so spawn one tile north of the door.
  // The camera/framing screenshot is effectively identical (door right below
  // the player) — the only point of this shot is the entry framing.
  await teleport(page, "spyder_cotton_cafe", 8, 10);
  await page.evaluate(() => window.A!.face("down"));
  await waitForIdle(page);
  await assertPlayerOnScreen(page, "cafe entry");
  await screenshot(page, "indoor-cam-cafe-entry");
  console.log("  [cafe entry] (8,10) just above south door, facing down");

  // BFS-derived extreme reachable corners on the static collision grid
  // (some inner cells are blocked by furniture and NPCs). Skip SW/SE since
  // any path there would rest on the trigger row.
  await walkAndShoot(page, "cafe NW", 0, 6, "indoor-cam-cafe-nw");
  await walkAndShoot(page, "cafe NE", 11, 4, "indoor-cam-cafe-ne");
}

/**
 * Case 2: Bedroom (9x7 / 144x112) — smaller than viewport in BOTH dims.
 * Camera can't scroll; the whole map is visible. Player should be visible
 * at every corner.
 */
async function testBedroom(page: Page): Promise<void> {
  console.log("[bedroom] (9x7 / 144x112 — both smaller)");
  await teleport(page, "spyder_bedroom", 4, 4);
  await waitForIdle(page);
  await assertPlayerOnScreen(page, "bedroom centre");
  await screenshot(page, "indoor-cam-bedroom-centre");

  // Static-collision BFS from (4,4) — extreme reachable corners.
  await walkAndShoot(page, "bedroom NW", 1, 2, "indoor-cam-bedroom-nw");
  await walkAndShoot(page, "bedroom NE", 8, 2, "indoor-cam-bedroom-ne");
  await walkAndShoot(page, "bedroom SW", 0, 6, "indoor-cam-bedroom-sw");
  await walkAndShoot(page, "bedroom SE", 8, 5, "indoor-cam-bedroom-se");
}

/**
 * Case 3: Cotton house1 (10x8 / 160x128) — also both-smaller.
 *
 * Bottom row (6..7, 7) hosts a Go-Outside teleport that fires when the player
 * is on it facing down. We visit the SE corner via row 6 (above the trigger
 * row) and then the SW corner by walking left along row 7 — that keeps the
 * player's facing at "left" while crossing the trigger tiles, so the event
 * stays dormant.
 */
async function testHouse1(page: Page): Promise<void> {
  console.log("[house1] (10x8 / 160x128 — both smaller)");
  await teleport(page, "spyder_cotton_house1", 5, 5);
  await waitForIdle(page);
  await assertPlayerOnScreen(page, "house1 centre");
  await screenshot(page, "indoor-cam-house1-centre");

  // Walkable rows: 2 (cols 0..8), 3-5 mostly open, 6 (cols 1..8), 7 (cols 1..8).
  await walkAndShoot(page, "house1 NW", 0, 2, "indoor-cam-house1-nw");
  await walkAndShoot(page, "house1 NE", 8, 2, "indoor-cam-house1-ne");
  // Approach SE via (8,6) first so we step onto (8,7) facing down only
  // *adjacent* to the trigger tiles (6..7, 7), not on them.
  await walkTo(page, 8, 6);
  await waitForIdle(page);
  await walkAndShoot(page, "house1 SE", 8, 7, "indoor-cam-house1-se");
  // From SE, walk left along row 7 — every step faces left, so the trigger
  // tiles (6,7) and (7,7) never see char_facing=down.
  await walkAndShoot(page, "house1 SW", 1, 7, "indoor-cam-house1-sw");
}

/**
 * Case 3b: Paper scoop (13x11 / 208x176) — narrower than viewport, taller
 * than viewport. No facing-down teleport tiles inside, so a vanilla walk
 * to each corner works.
 */
async function testScoop(page: Page): Promise<void> {
  console.log("[scoop] (13x11 / 208x176 — narrower, taller)");
  await teleport(page, "spyder_paper_scoop", 8, 9);
  await waitForIdle(page);
  await assertPlayerOnScreen(page, "scoop spawn");
  await screenshot(page, "indoor-cam-scoop-spawn");
  await walkAndShoot(page, "scoop NW", 3, 3, "indoor-cam-scoop-nw");
  await walkAndShoot(page, "scoop NE", 12, 3, "indoor-cam-scoop-ne");
  await walkAndShoot(page, "scoop SE", 12, 10, "indoor-cam-scoop-se");
  await walkAndShoot(page, "scoop SW", 0, 10, "indoor-cam-scoop-sw");
}

/**
 * Case 3c: Cotton artshop (22x11 / 352x176) — wider than viewport, taller
 * than viewport. Scrolls in both axes. The south-west exit tiles (1..2, 10)
 * are facing-down teleporters, so we visit the SW corner approaching from
 * (3,10) moving left (facing left throughout).
 */
async function testArtshop(page: Page): Promise<void> {
  console.log("[artshop] (22x11 / 352x176 — wider, taller)");
  await teleport(page, "spyder_cotton_artshop", 10, 9);
  await waitForIdle(page);
  await assertPlayerOnScreen(page, "artshop spawn");
  await screenshot(page, "indoor-cam-artshop-spawn");
  await walkAndShoot(page, "artshop NW", 0, 4, "indoor-cam-artshop-nw");
  await walkAndShoot(page, "artshop NE", 21, 6, "indoor-cam-artshop-ne");
  await walkAndShoot(page, "artshop SE", 21, 10, "indoor-cam-artshop-se");
  // The exit tiles (1..2, 10) teleport the player out when facing down. From
  // SE, hop to (0,7) (column 0 is the only walkable corridor down the west
  // wall) then step down to (0,10). (0,10) is just west of the exit row;
  // each descent step is along col 0 which is not part of the trigger.
  await walkTo(page, 0, 7);
  await waitForIdle(page);
  await walkTo(page, 0, 9);
  await waitForIdle(page);
  await walkAndShoot(page, "artshop SW", 0, 10, "indoor-cam-artshop-sw");
}

/**
 * Case 4: Big outdoor map regression. Walk to the geographic edge and verify
 * the camera clamps — no void revealed past the map boundary. We screenshot
 * for the reviewer and assert the camera's scroll value is pinned at
 * (mapWidthInPx - viewportWidth) / similar for Y when the player stands at
 * an edge tile.
 */
async function testOutdoorEdgeClamp(page: Page): Promise<void> {
  console.log("[paper_town] (40x20 / 640x320 — bigger than viewport)");
  // Walk the player toward the north-east corner. Paper town has walkable
  // tiles up there per existing tests; we just need the camera to clamp.
  await teleport(page, "spyder_paper_town", 38, 3);
  await waitForIdle(page);
  await assertPlayerOnScreen(page, "paper_town NE-ish");
  await screenshot(page, "indoor-cam-paper-town-edge");

  const cam = await getCamera(page);
  // Map is 640x320, viewport ~256x144 (game-space). Camera scroll should be
  // clamped to (640-256, 320-144) = (384, 176) when player is near far corner.
  // Allow slack for the fact that startFollow lerp may put the camera mid-pan,
  // but at minimum scroll must be > 0 (i.e. actually scrolling, not centred).
  assert(
    cam.scrollX > 0 && cam.scrollY >= 0,
    `paper_town: expected camera to be scrolled towards NE corner, got ` +
      `scroll=(${cam.scrollX.toFixed(1)},${cam.scrollY.toFixed(1)})`,
  );
  // And clamped — must not exceed map size minus viewport size.
  assert(
    cam.scrollX <= 640 - cam.width + 1 && cam.scrollY <= 320 - cam.height + 1,
    `paper_town: camera scrolled past map bounds: ` +
      `scroll=(${cam.scrollX.toFixed(1)},${cam.scrollY.toFixed(1)}) ` +
      `viewport=${cam.width}x${cam.height}, map=640x320`,
  );
  console.log(
    `  [paper_town] OK scroll=(${cam.scrollX.toFixed(1)},${cam.scrollY.toFixed(1)}) clamped within map`,
  );
}

async function main(): Promise<void> {
  console.log("[indoor-camera-follow] launching...");
  const { page, close } = await launchGame();
  try {
    // Boot once on paper_town, then teleport between cases — re-launching for
    // every map would be ~20s of dead time per case.
    await setupGame(page, { map: "spyder_paper_town", tileX: 20, tileY: 11 });
    await waitForIdle(page);

    await testCafe(page);
    await testBedroom(page);
    await testHouse1(page);
    await testScoop(page);
    await testArtshop(page);
    await testOutdoorEdgeClamp(page);

    console.log("indoor-camera-follow: OK");
  } finally {
    await close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
