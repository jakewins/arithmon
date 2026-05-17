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

  // Start inside the Paper Scoop, post-intro, with 500 gold
  await setupGame(page, { map: "spyder_paper_scoop", tileX: 6, tileY: 7, money: 500 });

  // Walk up to face the shopkeeper (at 7,4)
  await walkTo(page, 7, 5, "up");

  // Interact to trigger the Talk Shopkeeper event (starts dialog)
  await interact(page);

  // Small delay for dialog to render, then dismiss it
  await page.waitForTimeout(500);
  await interact(page);

  // Wait for the shop scene to start
  await waitForEvent(page, "scene_started");
  await page.waitForTimeout(500);
  await screenshot(page, "shop-open");

  // Get initial state to check gold
  const stateBefore = (await getState(page)) as unknown as GameState;
  const goldBefore = stateBefore.session.money;
  console.log("Gold before purchase:", goldBefore);

  // Start waiting for shop_buy event BEFORE pressing the key
  const buyEventPromise = waitForEvent(page, "shop_buy");

  // Buy the first item (Potion at 20g) — press Space to confirm
  await pressKey(page, KEY_SPACE);

  await buyEventPromise;
  await screenshot(page, "shop-purchased");

  // Verify gold decreased and item is in inventory
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

  // Close the shop
  await pressKey(page, KEY_ESC);

  await screenshot(page, "shop-closed");
  await close();
  console.log("PASS: Shop purchase flow works");
}

main();
