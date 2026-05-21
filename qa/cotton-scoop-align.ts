/**
 * QA: Cotton Scoop alignment with upstream (STORY-0225).
 *
 * Verifies the verbatim-port of `spyder_cotton_scoop.tmx`:
 *  - 3 NPCs spawn at the correct upstream tiles (shopkeeper @ (1,6),
 *    shopassistant @ (7,7), wayfarer1 @ (1,4)).
 *  - The `Receive capture device` cutscene fires on first walk into the
 *    counter row, both yes-path and no-path dispatch correctly, and grant 5
 *    tuxeballs each.
 *  - The three Open Shop / Open Tech interact events open the right shop UI
 *    with the upstream prices.
 *  - The exit teleport round-trips with `spyder_cotton_town`.
 */
import {
  launchGame,
  setupGame,
  walkTo,
  walkStep,
  interact,
  selectChoice,
  waitForIdle,
  getState,
  screenshot,
  type DebugEvent,
} from "./harness";
import type { Page } from "@playwright/test";

interface NpcSnapshot {
  slug: string;
  tileX: number;
  tileY: number;
  facing: string;
}

interface State {
  scene: string;
  mapKey?: string;
  player?: { tileX: number; tileY: number; facing: string };
  session?: {
    money: number;
    variables?: Record<string, string>;
    inventory?: { slug: string; count: number }[];
  };
  npcs: NpcSnapshot[];
  // ShopScene's getDebugState fields when active
  tab?: string;
  shopItems?: { slug: string; price: number }[];
}

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

const KEY_SPACE = 32;
const KEY_ESC = 27;
const KEY_DOWN = 40;

/** Press a key via document dispatch (Phaser listens on document). */
async function pressKey(page: Page, keyCode: number): Promise<void> {
  await page.evaluate((kc) => {
    document.dispatchEvent(new KeyboardEvent("keydown", { keyCode: kc, bubbles: true }));
  }, keyCode);
  await page.waitForTimeout(80);
  await page.evaluate((kc) => {
    document.dispatchEvent(new KeyboardEvent("keyup", { keyCode: kc, bubbles: true }));
  }, keyCode);
  await page.waitForTimeout(80);
}

const EXPECTED_NPCS: ReadonlyArray<{ slug: string; tileX: number; tileY: number }> = [
  { slug: "spyder_shopkeeper", tileX: 1, tileY: 6 },
  { slug: "spyder_shopassistant", tileX: 7, tileY: 7 },
  { slug: "spyder_wayfarer1_norm", tileX: 1, tileY: 4 },
];

/** Press interact until the dialog buffer drains (no open dialog left). */
async function drainDialogs(page: Page, maxPresses = 30): Promise<void> {
  for (let i = 0; i < maxPresses; i++) {
    const events = (await page.evaluate(() => [...window.A!.events])) as DebugEvent[];
    const types = events.map((e) => e.type);
    const lastOpen = types.lastIndexOf("dialog_opened");
    const lastClose = types.lastIndexOf("dialog_closed");
    if (lastOpen <= lastClose) return;
    await interact(page);
    await page.waitForTimeout(120);
  }
}

async function clearVariables(page: Page, keys: string[]): Promise<void> {
  await page.evaluate((ks) => {
    for (const k of ks) {
      window.A!.setVariable(k, "");
    }
  }, keys);
}

async function npcSpawnTest(page: Page): Promise<void> {
  console.log("[1/7] NPC spawns on map load");
  await setupGame(page, {
    map: "spyder_cotton_scoop",
    tileX: 6,
    tileY: 9,
    variables: { visitcottonmart: null, heardcapture: null },
  });
  await page.waitForTimeout(400);

  const st = (await getState(page)) as State;
  for (const expected of EXPECTED_NPCS) {
    const npc = st.npcs.find((n) => n.slug === expected.slug);
    assert(
      !!npc,
      `expected NPC ${expected.slug} to spawn; got ${JSON.stringify(st.npcs.map((n) => n.slug))}`,
    );
    assert(
      npc!.tileX === expected.tileX && npc!.tileY === expected.tileY,
      `${expected.slug}: expected (${expected.tileX},${expected.tileY}), got (${npc!.tileX},${npc!.tileY})`,
    );
  }
  await screenshot(page, "cotton-scoop-overview");
}

async function receiveCaptureYesPath(page: Page): Promise<void> {
  console.log("[2/7] Receive capture device (yes path)");
  await setupGame(page, {
    map: "spyder_cotton_scoop",
    tileX: 6,
    tileY: 9,
    variables: { visitcottonmart: null, heardcapture: null },
  });
  await page.waitForTimeout(400);

  // Walk into counter-row tile y=8 to trigger the cutscene.
  await walkStep(page, "up");
  await page.waitForTimeout(300);

  // Cutscene opens a dialog then a yes/no choice. Drain the opening dialog
  // (one press to close it), then poll for the choice menu.
  await drainDialogs(page);

  const choicePresented = await page.evaluate(async () => {
    for (let i = 0; i < 50; i++) {
      const found = window.A!.events.find((e) => e.type === "choice_presented");
      if (found) return found;
      await new Promise((r) => setTimeout(r, 100));
    }
    return null;
  });
  assert(!!choicePresented, "Receive-capture choice menu never opened");

  await screenshot(page, "cotton-scoop-tuxeball-gift");

  // Pick yes (index 0).
  await selectChoice(page, 0);
  await page.waitForTimeout(400);
  await drainDialogs(page);
  // Allow the shopkeeper to finish pathfinding back to (1,6) and the
  // 5×add_item to settle, then drain the "Got 5 Tuxeballs!" dialog.
  await page.waitForTimeout(1500);
  await drainDialogs(page);
  await waitForIdle(page);

  const st = (await getState(page)) as State;
  assert(
    st.session?.variables?.visitcottonmart === "yes",
    `expected visitcottonmart=yes, got ${st.session?.variables?.visitcottonmart}`,
  );
  assert(
    !st.session?.variables?.heardcapture || st.session?.variables?.heardcapture === "",
    `expected heardcapture cleared, got ${st.session?.variables?.heardcapture}`,
  );
  const tux = st.session?.inventory?.find((e) => e.slug === "tuxeball");
  assert(!!tux && tux.count >= 5, `expected >=5 tuxeballs in inventory, got ${tux?.count ?? 0}`);
}

async function receiveCaptureNoPath(page: Page): Promise<void> {
  console.log("[3/7] Receive capture device (no path)");
  await setupGame(page, {
    map: "spyder_cotton_scoop",
    tileX: 6,
    tileY: 9,
    variables: { visitcottonmart: null, heardcapture: null },
  });
  await page.waitForTimeout(400);

  await walkStep(page, "up");
  await page.waitForTimeout(300);
  await drainDialogs(page);

  const presented = await page.evaluate(async () => {
    for (let i = 0; i < 50; i++) {
      const found = window.A!.events.find((e) => e.type === "choice_presented");
      if (found) return true;
      await new Promise((r) => setTimeout(r, 100));
    }
    return false;
  });
  assert(presented, "Receive-capture choice menu never opened (no-path)");

  // Pick no (index 1).
  await selectChoice(page, 1);
  await page.waitForTimeout(400);
  await drainDialogs(page);
  // Player pathfinds to the assistant — give it generous time, then drain
  // the second explanation dialog plus the gift dialog.
  await page.waitForTimeout(3500);
  await drainDialogs(page);
  await page.waitForTimeout(500);
  await drainDialogs(page);
  await waitForIdle(page);

  await screenshot(page, "cotton-scoop-assistant-explain");

  const st = (await getState(page)) as State;
  const tux = st.session?.inventory?.find((e) => e.slug === "tuxeball");
  assert(!!tux && tux.count >= 5, `no-path: expected >=5 tuxeballs, got ${tux?.count ?? 0}`);
}

async function openShopAtCounter(page: Page): Promise<void> {
  console.log("[4/7] Open Shop A (front counter, 2,6)");
  await setupGame(page, {
    map: "spyder_cotton_scoop",
    tileX: 6,
    tileY: 9,
    money: 500,
    variables: { visitcottonmart: "yes", heardcapture: null },
  });
  await page.waitForTimeout(400);
  await clearVariables(page, ["heardcapture"]);

  // Counter tile (2,6) is itself a blocker; front-of-counter facing it is
  // (3,6) facing left.
  await walkTo(page, 3, 6, "left");
  await page.waitForTimeout(200);
  await interact(page);
  await page.waitForTimeout(600);

  // The interact triggers `dialog Welcome!` first, then open_shop. Press
  // through the dialog so the shop launches.
  await drainDialogs(page);
  await page.waitForTimeout(400);

  let st = (await getState(page)) as State;
  assert(st.scene === "ShopScene", `expected ShopScene, got ${st.scene}`);
  assert(
    st.shopItems !== undefined && st.shopItems.length === 3,
    `expected 3 shop items, got ${JSON.stringify(st.shopItems)}`,
  );
  const slugs = st.shopItems!.map((i) => i.slug);
  assert(
    slugs[0] === "potion" && slugs[1] === "revive" && slugs[2] === "tuxeball",
    `expected potion/revive/tuxeball order, got ${slugs}`,
  );
  const potion = st.shopItems!.find((i) => i.slug === "potion");
  assert(potion!.price === 20, `potion price ${potion!.price} != 20`);
  const tuxeball = st.shopItems!.find((i) => i.slug === "tuxeball");
  assert(tuxeball!.price === 50, `tuxeball price ${tuxeball!.price} != 50`);

  await screenshot(page, "cotton-scoop-shop-open");

  // Buy a potion — selection defaults to index 0 (potion). Press Enter to
  // confirm. Track inventory + money.
  const moneyBefore = st.session?.money ?? 0;
  const potionsBefore = st.session?.inventory?.find((e) => e.slug === "potion")?.count ?? 0;
  await pressKey(page, KEY_SPACE);
  await page.waitForTimeout(300);

  st = (await getState(page)) as State;
  const potionsAfter = st.session?.inventory?.find((e) => e.slug === "potion")?.count ?? 0;
  assert(
    potionsAfter === potionsBefore + 1,
    `expected potions ${potionsBefore + 1}, got ${potionsAfter}`,
  );
  assert(
    st.session!.money === moneyBefore - 20,
    `expected money ${moneyBefore - 20}, got ${st.session!.money}`,
  );

  // Close the shop with ESC.
  await pressKey(page, KEY_ESC);
  await page.waitForTimeout(300);

  st = (await getState(page)) as State;
  assert(st.scene === "OverworldScene", `expected OverworldScene after close, got ${st.scene}`);
}

async function openShopSideCounter(page: Page): Promise<void> {
  console.log("[5/7] Open Shop B (side counter, 1,7)");
  // Counter tile (1,7) is a blocker (row 7 has 0..2 blocked). Stand at
  // (1,8) facing up — but row 7 tiles 0..2 are walls. Actually checking
  // collisions: (0,7),(1,7) are blocked. Player approaches from (1,8)
  // facing up → faces (1,7) → triggers event B.
  await walkTo(page, 1, 8, "up");
  await page.waitForTimeout(200);
  await interact(page);
  await page.waitForTimeout(600);
  await drainDialogs(page);
  await page.waitForTimeout(400);

  const st = (await getState(page)) as State;
  assert(st.scene === "ShopScene", `Open Shop B: expected ShopScene, got ${st.scene}`);
  assert(
    st.shopItems !== undefined && st.shopItems.length === 3,
    `Open Shop B: expected 3 items, got ${JSON.stringify(st.shopItems)}`,
  );

  await pressKey(page, KEY_ESC);
  await page.waitForTimeout(300);
}

async function openTechShop(page: Page): Promise<void> {
  console.log("[6/7] Open Tech (2,4)");
  // Bump money so we can afford a TM.
  await page.evaluate(() => {
    window.A!.setupGame({
      map: "spyder_cotton_scoop",
      tileX: 6,
      tileY: 9,
      money: 10000,
      variables: { visitcottonmart: "yes", heardcapture: null },
    });
  });
  await page.waitForTimeout(800);
  await clearVariables(page, ["heardcapture"]);

  // Counter tile (2,4) is a blocker; approach from (3,4) facing left.
  await walkTo(page, 3, 4, "left");
  await page.waitForTimeout(200);
  await interact(page);
  await page.waitForTimeout(600);
  await drainDialogs(page);
  await page.waitForTimeout(400);

  let st = (await getState(page)) as State;
  assert(st.scene === "ShopScene", `Tech: expected ShopScene, got ${st.scene}`);
  assert(
    st.shopItems !== undefined && st.shopItems.length === 5,
    `Tech: expected 5 items, got ${JSON.stringify(st.shopItems)}`,
  );
  const expectedSlugs = ["miaow_milk", "pyramidion", "ox_stick", "tm_avalanche", "tm_blossom"];
  const slugs = st.shopItems!.map((i) => i.slug);
  assert(
    JSON.stringify(slugs) === JSON.stringify(expectedSlugs),
    `Tech slugs ${slugs} != ${expectedSlugs}`,
  );
  const blossom = st.shopItems!.find((i) => i.slug === "tm_blossom");
  assert(blossom!.price === 1000, `tm_blossom price ${blossom!.price} != 1000`);

  await screenshot(page, "cotton-scoop-tech-shop");

  // Buy tm_blossom — it's index 4. Navigate down 4 times then confirm.
  const moneyBefore = st.session?.money ?? 0;
  for (let i = 0; i < 4; i++) {
    await pressKey(page, KEY_DOWN);
  }
  await pressKey(page, KEY_SPACE);
  await page.waitForTimeout(300);

  st = (await getState(page)) as State;
  const blossomCount = st.session?.inventory?.find((e) => e.slug === "tm_blossom")?.count ?? 0;
  assert(blossomCount >= 1, `expected tm_blossom in inventory, got ${blossomCount}`);
  assert(
    st.session!.money === moneyBefore - 1000,
    `expected money ${moneyBefore - 1000}, got ${st.session!.money}`,
  );

  await pressKey(page, KEY_ESC);
  await page.waitForTimeout(300);
}

async function exitRoundtrip(page: Page): Promise<void> {
  console.log("[7/7] Exit round-trip with cotton_town");
  await setupGame(page, {
    map: "spyder_cotton_scoop",
    tileX: 6,
    tileY: 9,
    variables: { visitcottonmart: "yes", heardcapture: null },
  });
  await page.waitForTimeout(400);

  // Walk south onto (6,10) facing down → teleports to cotton_town (30,35).
  await walkStep(page, "down");
  await page.waitForTimeout(800);

  let st = (await getState(page)) as State;
  assert(
    st.mapKey === "spyder_cotton_town",
    `expected on spyder_cotton_town after exit, got ${st.mapKey}`,
  );
  assert(
    st.player?.tileX === 30 && st.player?.tileY === 35,
    `expected (30,35), got (${st.player?.tileX},${st.player?.tileY})`,
  );

  // Walk back up: cotton_town's Enter Cotton Scoop is at (30,34) facing up.
  await walkTo(page, 30, 34, "up");
  await page.waitForTimeout(800);
  st = (await getState(page)) as State;
  assert(
    st.mapKey === "spyder_cotton_scoop",
    `expected back on spyder_cotton_scoop, got ${st.mapKey}`,
  );
}

async function main(): Promise<void> {
  const { page, close } = await launchGame();
  try {
    await npcSpawnTest(page);
    await receiveCaptureYesPath(page);
    await receiveCaptureNoPath(page);
    await openShopAtCounter(page);
    await openShopSideCounter(page);
    await openTechShop(page);
    await exitRoundtrip(page);
    console.log("\nAll cotton-scoop alignment checks PASSED");
  } finally {
    await close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
