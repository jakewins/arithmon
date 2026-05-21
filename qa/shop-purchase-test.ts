/**
 * Smoke test for the Cotton Scoop shop buy flow. The richer
 * `cotton-scoop-align.ts` covers the full upstream port (NPC spawns,
 * tuxeball cutscene, both shop counters, the tech shop, exit round-trip);
 * this script focuses narrowly on the buy code path.
 */
import {
  launchGame,
  setupGame,
  walkTo,
  interact,
  waitForEvent,
  getState,
  screenshot,
} from "./harness";

interface GameState {
  scene: string;
  session: {
    money: number;
    inventory: { slug: string; name: string; count: number }[];
  };
}

/** Press a key via document dispatch (Phaser listens on document). */
async function pressKey(page: import("@playwright/test").Page, keyCode: number) {
  await page.evaluate((kc) => {
    document.dispatchEvent(new KeyboardEvent("keydown", { keyCode: kc, bubbles: true }));
  }, keyCode);
  await page.waitForTimeout(100);
  await page.evaluate((kc) => {
    document.dispatchEvent(new KeyboardEvent("keyup", { keyCode: kc, bubbles: true }));
  }, keyCode);
  await page.waitForTimeout(100);
}

const KEY_SPACE = 32;
const KEY_ESC = 27;

async function main() {
  const { page, close } = await launchGame();

  // Drop in front of the cotton-scoop shopkeeper's counter at (3,6) facing
  // left — `Open Shop A` (event at (2,6)) fires on INTERACT.
  // visitcottonmart:yes suppresses the first-visit tuxeball cutscene.
  await setupGame(page, {
    map: "spyder_cotton_scoop",
    tileX: 3,
    tileY: 6,
    money: 500,
    variables: { visitcottonmart: "yes" },
  });
  await walkTo(page, 3, 6, "left");
  await page.waitForTimeout(200);

  // Interact to trigger Open Shop A — pops a "Welcome!" dialog first, then
  // launches the shop on the next interact.
  await interact(page);
  await page.waitForTimeout(400);
  // Register the wait BEFORE dismissing the welcome dialog so we don't miss
  // ShopScene's scene_started fire.
  const shopOpened = waitForEvent(page, "scene_started");
  await interact(page);
  await shopOpened;
  await page.waitForTimeout(400);
  await screenshot(page, "shop-open");

  const stateBefore = (await getState(page)) as unknown as GameState;
  const goldBefore = stateBefore.session.money;
  console.log("Gold before purchase:", goldBefore);

  // Cotton scoop sells potions at 20G (upstream price). Buy index 0 (potion).
  const buyEventPromise = waitForEvent(page, "shop_buy");
  await pressKey(page, KEY_SPACE);
  await buyEventPromise;
  await screenshot(page, "shop-purchased");

  const stateAfter = (await getState(page)) as unknown as GameState;
  const goldAfter = stateAfter.session.money;
  console.log("Gold after purchase:", goldAfter);

  if (goldAfter !== goldBefore - 20) {
    throw new Error(`Expected gold to decrease by 20, got ${goldBefore} -> ${goldAfter}`);
  }

  const potion = stateAfter.session.inventory.find((i) => i.slug === "potion");
  if (!potion || potion.count < 1) {
    throw new Error(
      `Expected potion in inventory, got: ${JSON.stringify(stateAfter.session.inventory)}`,
    );
  }

  console.log("Inventory after purchase:", JSON.stringify(stateAfter.session.inventory));

  await pressKey(page, KEY_ESC);
  await screenshot(page, "shop-closed");
  await close();
  console.log("PASS: Shop purchase flow works");
}

main();
