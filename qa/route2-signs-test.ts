/**
 * Route 2 readable map-signs test (STORY-0220).
 *
 * Verifies the four `translated_dialog` sign events ported verbatim from
 * `upstream/mods/tuxemon/maps/spyder_route2.tmx` <objectgroup id="6">:
 *
 *   * Sign: City Park at (9, 2)  — `here_to_north`
 *   * Sign: Column 1  at (11, 7) — `spyder_column1_sign`
 *   * Sign: Column 2  at (15, 5) — `spyder_column2_sign`
 *   * Sign: Route 2   at (1, 7)  — `welcome_location_route`
 *
 * Coverage:
 *   1. Teleport adjacent-south of each sign, face up, INTERACT, and confirm a
 *      `dialog_opened` fires whose text matches the localized PO entry
 *      (after `${{...}}` substitution, since `welcome_location_route` and
 *      `here_to_north` contain placeholders).
 *   2. Negative: standing one tile away (not facing the sign) and pressing
 *      INTERACT does not open a dialog.
 *
 * Mirrors upstream's interactive-sign pattern; complements `route2-trainers-test`
 * and `route2-encounters-test` for full route2 event coverage.
 */
import {
  launchGame,
  setupGame,
  waitForIdle,
  getEvents,
  interact,
  screenshot,
  teleport,
} from "./harness";
import type { Page } from "@playwright/test";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

interface SignCase {
  name: string;
  signTileX: number;
  signTileY: number;
  /** Text fragment that must appear in the rendered dialog. */
  expectedFragment: string;
  /** Screenshot suffix. */
  screenshotName: string;
}

// Expected fragments are tolerant — we only assert on stable substrings so the
// test won't break the next time the PO copy gets tweaked. The full strings
// live in `public/assets/l10n/en_US.po`.
const SIGNS: SignCase[] = [
  {
    name: "Sign: City Park",
    signTileX: 9,
    signTileY: 2,
    // `here_to_north` = "From ${{map_name}} to ${{north}}". On route2 this
    // renders "From Route 2 to City Park" (slug-driven via session.mapMeta).
    expectedFragment: "From Route 2 to City Park",
    screenshotName: "route2-sign-city-park",
  },
  {
    name: "Sign: Column 1",
    signTileX: 11,
    signTileY: 7,
    expectedFragment: "ancient column",
    screenshotName: "route2-sign-column1",
  },
  {
    name: "Sign: Column 2",
    signTileX: 15,
    signTileY: 5,
    expectedFragment: "ancient column",
    screenshotName: "route2-sign-column2",
  },
  {
    name: "Sign: Route 2",
    signTileX: 1,
    signTileY: 7,
    // `welcome_location_route` = "Welcome to ${{map_name}}: ${{map_desc}}\n
    // North: ${{north}} / South: ${{south}} / West: ${{west}} / East: ${{east}}".
    // Pin the leading map_name + map_desc — those are the most load-bearing
    // bits for "the route name renders correctly" per the acceptance criteria.
    expectedFragment: "Welcome to Route 2: The historic path!",
    screenshotName: "route2-sign-route2",
  },
];

/** Read the most-recent dialog_opened text; undefined if no open dialog. */
async function lastDialogText(page: Page): Promise<string | undefined> {
  const events = await getEvents(page);
  const lastOpen = events.map((e) => e.type).lastIndexOf("dialog_opened");
  const lastClose = events.map((e) => e.type).lastIndexOf("dialog_closed");
  if (lastOpen <= lastClose) return undefined;
  return (events[lastOpen].data as { text?: string }).text;
}

/** Teleport south of the sign, face up, INTERACT, confirm dialog. */
async function testSignInteract(sign: SignCase): Promise<void> {
  console.log(`[route2 signs] ${sign.name} launching...`);
  const { page, close } = await launchGame();
  try {
    // Spawn directly south of the sign — the only walkable adjacency for all
    // four upstream signs (they sit at the top of a row in each case).
    await setupGame(page, {
      map: "spyder_route2",
      tileX: sign.signTileX,
      tileY: sign.signTileY + 1,
    });
    await waitForIdle(page);

    // Clear any stray events from the boot path so our dialog assertion only
    // sees the sign's own fire.
    await page.evaluate(() => window.A!.clearEvents());

    await page.evaluate(() => window.A!.face("up"));
    await interact(page);
    await page.waitForTimeout(250);

    const text = await lastDialogText(page);
    assert(text !== undefined, `${sign.name}: expected dialog to open after INTERACT, none did`);
    assert(
      text!.includes(sign.expectedFragment),
      `${sign.name}: dialog text "${text}" missing expected fragment "${sign.expectedFragment}"`,
    );
    // Sanity-check that placeholder substitution actually ran — if a `${{...}}`
    // literal slips through we want this to fail loudly.
    assert(
      !text!.includes("${{"),
      `${sign.name}: dialog text still contains a literal placeholder: "${text}"`,
    );

    await screenshot(page, sign.screenshotName);
    console.log(`[route2 signs] ${sign.name} OK`);
  } finally {
    await close();
  }
}

/** Negative: facing away from a sign and pressing INTERACT must not open a dialog. */
async function testNegativeNoDialog(): Promise<void> {
  console.log("[route2 signs] negative (not-facing) launching...");
  const { page, close } = await launchGame();
  try {
    // Stand south of `Sign: Column 2` at (15, 5), but face DOWN — the sign is
    // to the north, so `is char_facing_tile player` must NOT match.
    await setupGame(page, { map: "spyder_route2", tileX: 15, tileY: 6 });
    await waitForIdle(page);
    await page.evaluate(() => window.A!.clearEvents());

    await page.evaluate(() => window.A!.face("down"));
    await interact(page);
    await page.waitForTimeout(250);

    const text = await lastDialogText(page);
    assert(text === undefined, `negative: expected no dialog while facing away, got "${text}"`);
    console.log("[route2 signs] negative (not-facing) OK");
  } finally {
    await close();
  }
}

/** Negative: standing one tile too far from a sign + INTERACT also must not fire. */
async function testNegativeOffByOne(): Promise<void> {
  console.log("[route2 signs] negative (off-by-one) launching...");
  const { page, close } = await launchGame();
  try {
    // Teleport to (15, 7) — two tiles south of Sign: Column 2 (15, 5) — and
    // face up. `char_facing_tile` checks the tile in front of the player
    // (15, 6), which is not the sign.
    await setupGame(page, { map: "spyder_route2", tileX: 15, tileY: 7 });
    await waitForIdle(page);
    await teleport(page, "spyder_route2", 15, 7);
    await waitForIdle(page);
    await page.evaluate(() => window.A!.clearEvents());

    await page.evaluate(() => window.A!.face("up"));
    await interact(page);
    await page.waitForTimeout(250);

    const text = await lastDialogText(page);
    assert(text === undefined, `negative: expected no dialog at off-by-one tile, got "${text}"`);
    console.log("[route2 signs] negative (off-by-one) OK");
  } finally {
    await close();
  }
}

async function main(): Promise<void> {
  for (const sign of SIGNS) {
    await testSignInteract(sign);
  }
  await testNegativeNoDialog();
  await testNegativeOffByOne();
  console.log("route2-signs-test: OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
