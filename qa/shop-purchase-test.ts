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

  // Start inside the Cotton Scoop (paper_scoop's shop is event-less post-port —
  // it's the cutscene yard, not a buyable storefront). Cotton scoop has the
  // shopkeeper at (2,3) on top of the counter; the player stands at (2,5)
  // facing up — char_facing_char checks two tiles ahead, so we look past the
  // counter at (2,4) to interact with the shopkeeper.
  await setupGame(page, { map: "spyder_cotton_scoop", tileX: 2, tileY: 5, money: 500 });
  await walkTo(page, 2, 5, "up");

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

  // Buy the first item (Potion at 50g in cotton scoop) — press Space to confirm
  await pressKey(page, KEY_SPACE);

  await buyEventPromise;
  await screenshot(page, "shop-purchased");

  // Verify gold decreased and item is in inventory
  const stateAfter = (await getState(page)) as unknown as GameState;
  const goldAfter = stateAfter.session.money;
  console.log("Gold after purchase:", goldAfter);

  if (goldAfter !== goldBefore - 50) {
    throw new Error(`Expected gold to decrease by 50, got ${goldBefore} -> ${goldAfter}`);
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
