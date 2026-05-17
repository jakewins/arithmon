import { launchGame, setupGame, getState, screenshot, waitForEvent } from "./harness";
import type { Page } from "@playwright/test";

interface GameState {
  session: {
    money: number;
    inventory: { slug: string; name: string; count: number }[];
    monsters: { slug: string; currentHp: number; maxHp: number }[];
  };
}

/** Press a key via document dispatch (Phaser listens on document). */
async function pressKey(page: Page, keyCode: number) {
  await page.evaluate((kc) => {
    document.dispatchEvent(new KeyboardEvent("keydown", { keyCode: kc, bubbles: true }));
  }, keyCode);
  await page.waitForTimeout(100);
  await page.evaluate((kc) => {
    document.dispatchEvent(new KeyboardEvent("keyup", { keyCode: kc, bubbles: true }));
  }, keyCode);
  await page.waitForTimeout(100);
}

const KEY_DOWN = 40;
const KEY_SPACE = 32;
const KEY_ESC = 27;

async function main() {
  const { page, close } = await launchGame();
  await setupGame(page, {
    map: "spyder_paper_town",
    tileX: 10,
    tileY: 12,
    items: [
      { slug: "potion", count: 3 },
      { slug: "tuxeball", count: 5 },
      { slug: "revive", count: 1 },
    ],
  });

  // Open pause menu (ESC) — start waiting before pressing
  const pauseOpened = waitForEvent(page, "pause_menu_opened");
  await pressKey(page, KEY_ESC);
  await pauseOpened;
  await page.waitForTimeout(300);
  await screenshot(page, "bag-pause-menu");

  // Navigate down to "Bag" (Tuxemon=0, Journal=1, Bag=2)
  await pressKey(page, KEY_DOWN); // -> Journal
  await pressKey(page, KEY_DOWN); // -> Bag

  // Open Bag — start waiting before pressing
  const bagStarted = waitForEvent(page, "scene_started");
  await pressKey(page, KEY_SPACE);
  await bagStarted;
  await page.waitForTimeout(300);
  await screenshot(page, "bag-screen");

  // Verify items are displayed
  const state = (await getState(page)) as unknown as GameState;
  console.log("Inventory:", JSON.stringify(state.session.inventory));

  const potionEntry = state.session.inventory.find((i) => i.slug === "potion");
  if (!potionEntry || potionEntry.count < 3) {
    throw new Error(`Expected at least 3 potions, got: ${JSON.stringify(potionEntry)}`);
  }

  // Navigate down to tuxeball (index 1)
  await pressKey(page, KEY_DOWN);
  await page.waitForTimeout(200);
  await screenshot(page, "bag-item-tuxeball");

  // Navigate down to revive (index 2)
  await pressKey(page, KEY_DOWN);
  await page.waitForTimeout(200);
  await screenshot(page, "bag-item-revive");

  // Navigate back to potion (index 0) — wraps around
  await pressKey(page, KEY_DOWN);
  await page.waitForTimeout(200);
  await screenshot(page, "bag-item-potion-selected");

  // Try to use potion — monster is at full HP, should show message
  await pressKey(page, KEY_SPACE);
  await page.waitForTimeout(500);
  await screenshot(page, "bag-use-full-hp");

  // Try tuxeball — not usable in overworld
  await pressKey(page, KEY_DOWN); // -> tuxeball
  await pressKey(page, KEY_SPACE);
  await page.waitForTimeout(500);
  await screenshot(page, "bag-cant-use-here");

  // Close bag with ESC
  await pressKey(page, KEY_ESC);
  await page.waitForTimeout(300);
  await screenshot(page, "bag-closed-pause-menu");

  // Close pause menu
  await pressKey(page, KEY_ESC);
  await page.waitForTimeout(300);
  await screenshot(page, "bag-back-to-overworld");

  await close();
  console.log("PASS: Bag screen renders correctly");
}

main();
