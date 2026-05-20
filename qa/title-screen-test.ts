import { launchGame, setupGame, getState, screenshot } from "./harness";
import type { Page } from "@playwright/test";

/** Press a key via document dispatch (Phaser listens on document). */
async function pressKey(page: Page, keyCode: number) {
  await page.evaluate((kc) => {
    document.dispatchEvent(new KeyboardEvent("keydown", { keyCode: kc, bubbles: true }));
  }, keyCode);
  await page.waitForTimeout(80);
  await page.evaluate((kc) => {
    document.dispatchEvent(new KeyboardEvent("keyup", { keyCode: kc, bubbles: true }));
  }, keyCode);
  await page.waitForTimeout(80);
}

const KEY_UP = 38;
const KEY_DOWN = 40;
const KEY_ENTER = 13;

interface TitleState {
  scene: string;
  title?: { selected: number; selectedOption: string | null; options: string[] };
}

async function expect(cond: boolean, msg: string) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

async function main() {
  // --- Pass 1: No save. Title shows only New Game. Pressing it boots the
  //     character-creation cutscene.
  const session1 = await launchGame();
  const page = session1.page;

  // Clear any leftover save from previous runs so this pass is deterministic.
  await page.evaluate(() => localStorage.removeItem("arithmon_save"));
  // Restart the page so TitleScene rebuilds its menu without the leftover save.
  await page.reload();
  await page.waitForFunction(() => window.A?.ready, null, { timeout: 30_000 });

  let state = (await getState(page)) as unknown as TitleState;
  await expect(state.scene === "TitleScene", `expected TitleScene, got ${state.scene}`);
  await expect(
    state.title?.options.length === 1 && state.title.options[0] === "new_game",
    `expected only [new_game], got ${JSON.stringify(state.title?.options)}`,
  );
  await screenshot(page, "title-screen-no-save");

  // Press Enter on "New Game" — expect transition to OverworldScene (which
  // immediately launches CutsceneScene for the character-creation intro).
  await pressKey(page, KEY_ENTER);

  // Wait for cutscene to start (the new-game flow goes Title → Overworld →
  // Cutscene immediately on a fresh boot).
  await page.waitForFunction(
    () => window.A?.getState().scene === "CutsceneScene",
    null,
    { timeout: 10_000 },
  );
  state = (await getState(page)) as unknown as TitleState;
  await expect(
    state.scene === "CutsceneScene",
    `expected CutsceneScene after New Game, got ${state.scene}`,
  );
  await screenshot(page, "title-screen-new-game-confirmed");
  await session1.close();

  // --- Pass 2: With a save in place. Title shows Load Game first, and
  //     selecting it resumes from the saved map.
  const session2 = await launchGame();
  // setupGame teleports past the title and persists a save (via OverworldScene.init).
  await setupGame(session2.page, { map: "spyder_paper_town", tileX: 10, tileY: 12 });
  // Reload so we boot from a "save exists" state. TitleScene should now show
  // Load Game.
  await session2.page.reload();
  await session2.page.waitForFunction(() => window.A?.ready, null, { timeout: 30_000 });

  state = (await getState(session2.page)) as unknown as TitleState;
  await expect(
    state.scene === "TitleScene",
    `expected TitleScene on second boot, got ${state.scene}`,
  );
  await expect(
    state.title?.options.includes("load_game") === true,
    `expected load_game in options, got ${JSON.stringify(state.title?.options)}`,
  );
  await expect(
    state.title?.selectedOption === "load_game",
    `expected load_game selected by default, got ${state.title?.selectedOption}`,
  );
  await screenshot(session2.page, "title-screen-with-save");

  // Press Down then Up to verify keyboard navigation moves the cursor.
  await pressKey(session2.page, KEY_DOWN);
  state = (await getState(session2.page)) as unknown as TitleState;
  await expect(
    state.title?.selectedOption === "new_game",
    `expected new_game after Down, got ${state.title?.selectedOption}`,
  );
  await pressKey(session2.page, KEY_UP);
  state = (await getState(session2.page)) as unknown as TitleState;
  await expect(
    state.title?.selectedOption === "load_game",
    `expected load_game after Up, got ${state.title?.selectedOption}`,
  );

  // Press Enter to confirm Load Game.
  await pressKey(session2.page, KEY_ENTER);
  await session2.page.waitForFunction(
    () => window.A?.getState().scene === "OverworldScene",
    null,
    { timeout: 10_000 },
  );
  state = (await getState(session2.page)) as unknown as TitleState;
  await expect(
    state.scene === "OverworldScene",
    `expected OverworldScene after Load Game, got ${state.scene}`,
  );
  // Verify we resumed at the saved map+tile.
  const fullState = (await getState(session2.page)) as unknown as {
    player?: { tileX: number; tileY: number };
  };
  await expect(
    fullState.player?.tileX === 10 && fullState.player?.tileY === 12,
    `expected resume at (10,12), got (${fullState.player?.tileX},${fullState.player?.tileY})`,
  );
  await screenshot(session2.page, "title-screen-load-game-confirmed");

  await session2.close();
  console.log("title-screen-test: OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
