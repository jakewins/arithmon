/**
 * End-to-end test for STORY-0199's character-creation flow. Walks the
 * full start_tuxemon.yaml path from the title screen through campaign,
 * gender, and race choices, and verifies the chosen template + gender are
 * applied before the spyder_bedroom map loads.
 */
import { launchGame, getState, screenshot } from "./harness";
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

const KEY_ENTER = 13;

interface FullState {
  scene: string;
  mapKey?: string;
  player?: { tileX: number; tileY: number; facing: string; texture?: string };
  session?: {
    template: string;
    gender: string | null;
    variables: Record<string, string>;
  };
}

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

interface PathSpec {
  /** Display name for log messages. */
  name: string;
  /** Indices for the three start_tuxemon choices (campaign, gender, race). */
  choices: [number, number, number];
  /** Expected scenario_choice variable after step 1. */
  scenario: string;
  /** Expected gender_choice variable after step 2. */
  genderChoice: string;
  /** Expected race_choice variable after step 3. */
  raceChoice: string;
  /** Expected player.gender attribute (set_char_attribute). */
  gender: string;
  /** Expected player.template (set_template, overworld arg). */
  template: string;
}

async function runPath(spec: PathSpec): Promise<void> {
  console.log(`[${spec.name}] booting...`);
  const { page, close } = await launchGame();

  // Force a fresh boot: clear any leftover save so TitleScene shows
  // "New Game" as the default option.
  await page.evaluate(() => localStorage.removeItem("arithmon_save"));
  await page.reload();
  await page.waitForFunction(() => window.A?.ready, null, { timeout: 30_000 });

  // Title screen → press Enter on "New Game" → CutsceneScene runs
  // start_tuxemon.yaml. The first event (Scenario) fires immediately.
  let state = (await getState(page)) as unknown as FullState;
  assert(state.scene === "TitleScene", `expected TitleScene, got ${state.scene}`);
  await pressKey(page, KEY_ENTER);
  await page.waitForFunction(() => window.A?.getState().scene === "CutsceneScene", null, {
    timeout: 10_000,
  });

  // Walk the three choices. We assert the variable is set after each
  // selection so a regression in any single step is easy to localize.
  const expectedVars = [spec.scenario, spec.genderChoice, spec.raceChoice];
  const varNames = ["scenario_choice", "gender_choice", "race_choice"];
  let seenChoices = 0;
  for (let i = 0; i < 3; i++) {
    seenChoices += 1;
    await page.waitForFunction(
      (need) => window.A!.events.filter((e) => e.type === "choice_presented").length >= need,
      seenChoices,
      { timeout: 5_000 },
    );
    await screenshot(page, `character-creation-${spec.name}-step${i + 1}`);
    await page.evaluate((idx) => window.A!.selectChoice(idx), spec.choices[i]);
    // Give the engine a tick to apply the variable + advance to the next
    // event (set_template fires on the same tick as the race choice).
    await page.waitForTimeout(200);
    state = (await getState(page)) as unknown as FullState;
    assert(
      state.session?.variables[varNames[i]] === expectedVars[i],
      `[${spec.name}] step ${i + 1}: expected ${varNames[i]}=${expectedVars[i]}, got ${state.session?.variables[varNames[i]]}`,
    );
  }

  // Final step in start_tuxemon: Spyder event fires transition_teleport
  // to spyder_bedroom (4,4). Wait for OverworldScene + fade to settle.
  await page.waitForFunction(() => window.A?.getState().scene === "OverworldScene", null, {
    timeout: 10_000,
  });
  await page.waitForTimeout(600);

  state = (await getState(page)) as unknown as FullState;
  assert(
    state.mapKey === "spyder_bedroom",
    `[${spec.name}] expected mapKey=spyder_bedroom, got ${state.mapKey}`,
  );
  assert(
    state.player?.tileX === 4 && state.player?.tileY === 4,
    `[${spec.name}] expected spawn at (4,4), got (${state.player?.tileX},${state.player?.tileY})`,
  );
  assert(
    state.session?.template === spec.template,
    `[${spec.name}] expected template=${spec.template}, got ${state.session?.template}`,
  );
  assert(
    state.session?.gender === spec.gender,
    `[${spec.name}] expected gender=${spec.gender}, got ${state.session?.gender}`,
  );
  // Bounce-back fix: assert the actual rendered texture key on the player
  // sprite, not just the session template slug. Catches the regression
  // where all six template PNGs were byte-identical adventurer.png
  // placeholders — every branch passed the template check but rendered
  // the same sprite. See JOURNAL.md 2026-05-20.
  assert(
    state.player?.texture === spec.template,
    `[${spec.name}] expected player sprite texture=${spec.template}, got ${state.player?.texture}`,
  );

  await screenshot(page, `character-creation-${spec.name}-final`);
  await close();
  console.log(`[${spec.name}] OK`);
}

async function main(): Promise<void> {
  // Two paths from upstream's start_tuxemon.yaml. spyder_campaign is the
  // only campaign with a working destination map in our content (xero +
  // water teleport to maps we haven't ported yet), so both paths use it.
  await runPath({
    name: "male-white",
    choices: [0, 0, 1], // spyder_campaign, gender_male, white_male
    scenario: "spyder_campaign",
    genderChoice: "gender_male",
    raceChoice: "white_male",
    gender: "male",
    template: "adventurer",
  });
  await runPath({
    name: "female-black",
    choices: [0, 1, 0], // spyder_campaign, gender_female, black_female
    scenario: "spyder_campaign",
    genderChoice: "gender_female",
    raceChoice: "black_female",
    gender: "female",
    template: "brownheroine_brown",
  });
  console.log("character-creation-test: OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
