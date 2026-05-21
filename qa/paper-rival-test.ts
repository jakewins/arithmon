/**
 * Paper Rival House verbatim-port smoke test (STORY-0214).
 *
 * Exercises the three connected rival-house maps end-to-end:
 *   - spyder_paper_rival_downstairs  (11x12, slug "rival_downstairs")
 *   - spyder_paper_rival_bedroom     (7x7,   slug "rival_bedroom")
 *   - spyder_paper_rival_office      (7x7,   slug "rival_office")
 *
 * Coverage:
 *   1. Front-door entry from spyder_paper_town (32,5) → downstairs (1,11) up,
 *      with map slug/dimensions/layer + Collisions sanity-check
 *   2. Downstairs interactables: TV + Package (choice = "no", pre-flashback);
 *      Package re-talk after the gate is set fires Package (not Flashback)
 *   3. Bedroom stairwell round-trip (downstairs (3,3) right ↔ bedroom (0,3) left)
 *   4. Bedroom interactables: Bed, Bookshelf, Use Computer (access_pc),
 *      Radio (tune_radio stub no-op), Weights
 *   5. Office stairwell round-trip (downstairs (0,3) left ↔ office (6,3) right)
 *   6. Office interactable: Haiku
 *   7. Front-door exit downstairs (1,11) down → paper_town (32,6) down
 *   8. TV-flashback cutscene force-trigger (billie_tv:yes) — completes,
 *      flashback:off + billie_tv cleared
 *   9. Package→Daycare→Downstairs flashback round-trip (force billie_grandma:yes
 *      then walk through). Ends back at downstairs (7,9) with billie_grandma=done.
 *  10. Collision sanity: sample a blocked tile in each map.
 *
 * Notes:
 *   - `tune_radio` and `music_home` are no-op/console-log stubs (out of scope).
 *   - The TV-Yes cutscene uses set_template invisible + set_layer + char_position
 *     to puppeteer the player; visual fidelity is out of scope — only that the
 *     cutscene completes end-to-end without crashing.
 */
import {
  launchGame,
  setupGame,
  walkTo,
  waitForIdle,
  getState,
  interact,
  screenshot,
} from "./harness";
import type { Page } from "@playwright/test";

interface NpcSnapshot {
  slug: string;
  tileX: number;
  tileY: number;
  facing: string;
}

interface RivalState {
  mapKey?: string;
  player?: { tileX: number; tileY: number; facing: string };
  session?: { variables?: Record<string, string> };
  // `npcs` is optional here — `getState()` always returns it, but the harness
  // declares it as `Record<string, unknown>`, so making it optional avoids
  // unsafe casts at every call site without adding `unknown` indirection.
  npcs?: NpcSnapshot[];
}

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

/** Press interact until a dialog opens, then return its text. */
async function pressUntilDialog(page: Page, maxSteps = 8): Promise<string> {
  await page.evaluate(() => window.A!.clearEvents?.());
  for (let i = 0; i < maxSteps; i++) {
    await interact(page);
    await page.waitForTimeout(150);
    const events = await page.evaluate(() => [...window.A!.events]);
    const opened = events.find((e) => e.type === "dialog_opened");
    if (opened) return String((opened.data as { text?: string }).text ?? "");
  }
  throw new Error(`No dialog after ${maxSteps} interacts`);
}

/** Press interact to dismiss any open dialog chain, returning once a close fires. */
async function dismissDialogs(page: Page, maxSteps = 12): Promise<void> {
  for (let i = 0; i < maxSteps; i++) {
    await interact(page);
    await page.waitForTimeout(120);
    const events = await page.evaluate(() => [...window.A!.events]);
    let closed = false;
    for (let j = events.length - 1; j >= 0; j--) {
      if (events[j].type === "dialog_closed") {
        closed = true;
        break;
      }
    }
    if (closed) break;
  }
  await waitForIdle(page).catch(() => undefined);
}

/** Poll until the active map matches `mapKey`. */
async function waitForMap(page: Page, mapKey: string, timeoutMs = 7000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const s = (await page.evaluate(() => window.A!.getState())) as RivalState;
    if (s.mapKey === mapKey) return;
    await page.waitForTimeout(120);
  }
  throw new Error(`Timed out waiting for mapKey=${mapKey}`);
}

/** Wait for a `choice_presented` debug event, signalling translated_dialog_choice. */
async function waitForChoice(page: Page, timeoutMs = 4000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const events = await page.evaluate(() => [...window.A!.events]);
    if (events.find((e) => e.type === "choice_presented")) return;
    // Power through any pending dialog so the choice action can run.
    await interact(page);
    await page.waitForTimeout(150);
  }
  throw new Error("Timed out waiting for choice_presented");
}

/** Pick a choice by 0-based index. */
async function pickChoice(page: Page, index: number): Promise<void> {
  await page.evaluate((i) => window.A!.selectChoice(i), index);
  await page.waitForTimeout(150);
}

async function testFrontDoorEntry(): Promise<void> {
  console.log("[downstairs entry] launching...");
  const { page, close } = await launchGame();
  try {
    // Stand one south of the front-door trigger tile in paper_town.
    await setupGame(page, { map: "spyder_paper_town", tileX: 32, tileY: 6 });
    await waitForIdle(page);

    // Step onto (32,5) — the Teleport to Rival House trigger.
    walkTo(page, 32, 5, "up").catch(() => undefined);
    await waitForMap(page, "spyder_paper_rival_downstairs");

    const s = (await getState(page)) as RivalState;
    assert(
      s.player?.tileX === 1 && s.player?.tileY === 11,
      `expected downstairs (1,11), got (${s.player?.tileX},${s.player?.tileY})`,
    );
    assert(s.player?.facing === "up", `expected facing up, got ${s.player?.facing}`);

    // Map slug + dimensions + layer + Collisions sanity-check.
    const meta = (await page.evaluate(async () => {
      const r = await fetch("/assets/maps/spyder_paper_rival_downstairs.json");
      const m = (await r.json()) as {
        width: number;
        height: number;
        properties?: { name: string; value: unknown }[];
        layers: { name: string; type: string }[];
        tilesets: { name: string; firstgid: number }[];
      };
      const slug = m.properties?.find((p) => p.name === "slug")?.value as string | undefined;
      const collisionsLayer = m.layers.find((l) => l.name === "Collisions");
      return {
        width: m.width,
        height: m.height,
        slug,
        layerNames: m.layers.map((l) => l.name),
        hasCollisions: !!collisionsLayer && collisionsLayer.type === "objectgroup",
        tilesetCount: m.tilesets.length,
      };
    })) as {
      width: number;
      height: number;
      slug?: string;
      layerNames: string[];
      hasCollisions: boolean;
      tilesetCount: number;
    };
    assert(
      meta.width === 11 && meta.height === 12,
      `expected 11x12 downstairs, got ${meta.width}x${meta.height}`,
    );
    assert(meta.slug === "rival_downstairs", `expected slug "rival_downstairs", got "${meta.slug}"`);
    assert(meta.hasCollisions, `expected Collisions objectgroup; got ${meta.layerNames.join(",")}`);
    assert(
      meta.tilesetCount === 4,
      `expected 4 tilesets (incl. core_indoor_stairs), got ${meta.tilesetCount}`,
    );
    for (const want of ["Tile Layer 1", "Tile Layer 2", "Tile Layer 3", "Above player"]) {
      assert(
        meta.layerNames.includes(want),
        `expected layer "${want}", got ${meta.layerNames.join(",")}`,
      );
    }

    await screenshot(page, "paper-rival-downstairs-entry");
    console.log("[downstairs entry] OK");
  } finally {
    await close();
  }
}

async function testTvAndPackageNoChoice(): Promise<void> {
  console.log("[tv + package interact] launching...");
  const { page, close } = await launchGame();
  try {
    // Stand south of the TV trigger (4,7) so we're facing up onto it.
    await setupGame(page, {
      map: "spyder_paper_rival_downstairs",
      tileX: 4,
      tileY: 8,
    });
    await waitForIdle(page);
    await page.evaluate(() => window.A!.face?.("up"));
    await waitForIdle(page);

    // TV: plays spyder_rivaldownstairs_tv → spyder_billie_tv_flashback_trigger →
    // choice. Pick "no".
    const tvText = await pressUntilDialog(page);
    assert(tvText.length > 0, "expected TV dialog text");
    await dismissDialogs(page); // close first dialog
    await waitForChoice(page);
    await pickChoice(page, 0); // "no" — the option order is no:yes
    await waitForIdle(page);
    let s = (await getState(page)) as RivalState;
    assert(
      s.session?.variables?.billie_tv === "no",
      `expected billie_tv=no, got ${s.session?.variables?.billie_tv}`,
    );
    assert(
      s.session?.variables?.flashback === "on",
      `expected flashback=on (TV action sets it after choice), got ${s.session?.variables?.flashback}`,
    );
    await screenshot(page, "paper-rival-tv-prompt");

    // Walk to (8,10) and face up to talk to the Package at (8,9). The
    // collision rect at (8,9) 2x2 means (8,9) and (9,9) and (8,10) and
    // (9,10) are blocked. We need to approach from the WEST: (7,9) facing
    // right (no — also blocked). From the NORTH (8,8): the (3,4) 8x3
    // rect covers (3,4..6) → (8,8) is free? Actually (3,4,8,3) is rows
    // 4,5,6 → (8,8) is below that. And (4,7,2,1) covers (4,7) & (5,7).
    // (8,8) is free. Approach from (8,8) facing down? No — Package
    // trigger fires when char_facing_tile == package tile. So we need to
    // be adjacent and facing it. Let's go (8,8) facing down — wait that
    // makes us face (8,9). Yes that works.
    await page.evaluate(() => window.A!.teleport!("spyder_paper_rival_downstairs", 8, 8));
    await waitForIdle(page);
    await page.evaluate(() => window.A!.face?.("down"));
    await waitForIdle(page);

    // First interact — Flashback event fires (not Package, because
    // billie_grandma is not yet set; flashback gate "not variable_set
    // billie_grandma" is true). Plays package + flashback_trigger + choice.
    const pkgText = await pressUntilDialog(page);
    assert(pkgText.length > 0, "expected Package dialog");
    await dismissDialogs(page); // close first message
    await waitForChoice(page);
    await pickChoice(page, 0); // "no"
    await waitForIdle(page);
    s = (await getState(page)) as RivalState;
    assert(
      s.session?.variables?.billie_grandma === "no",
      `expected billie_grandma=no, got ${s.session?.variables?.billie_grandma}`,
    );

    // Re-talk — now Package event fires (variable_set billie_grandma is true,
    // and Flashback's "not variable_set billie_grandma" is false). Single
    // dialog, no choice.
    await page.evaluate(() => window.A!.clearEvents?.());
    await page.evaluate(() => window.A!.face?.("down"));
    await waitForIdle(page);
    await pressUntilDialog(page); // just verify one fires
    await dismissDialogs(page);
    // No new choice should be presented.
    const events = await page.evaluate(() => [...window.A!.events]);
    const choices = events.filter((e) => e.type === "choice_presented");
    assert(
      choices.length === 0,
      `expected no choice on Package re-talk (Flashback gated out), got ${choices.length}`,
    );

    console.log("[tv + package interact] OK");
  } finally {
    await close();
  }
}

async function testBedroomStairwellRoundTrip(): Promise<void> {
  console.log("[bedroom stairwell] launching...");
  const { page, close } = await launchGame();
  try {
    // Downstairs (3,3) facing right → bedroom (0,3) facing right.
    // (3,3) is on the Go Bedroom trigger; entry must face right.
    await setupGame(page, {
      map: "spyder_paper_rival_downstairs",
      tileX: 4,
      tileY: 3,
    });
    await waitForIdle(page);
    // Walk west onto (3,3) facing left initially, then face right and step.
    // Simpler: teleport just east of trigger and walk left then face right?
    // Just teleport to (4,3) and walk left onto (3,3) facing right.
    walkTo(page, 3, 3, "right").catch(() => undefined);
    // Direct approach via debug face + step doesn't trigger walk-onto; use
    // teleport to (4,3) then face right (already facing) and walk to (3,3)
    // wait — facing right and walking left contradicts. The walk-onto
    // condition checks player facing at the moment they land on the tile.
    // Use the same pattern as daycare: teleport adjacent, then walkTo the
    // trigger tile with the required facing as the final movement.
    // From (4,3), walking onto (3,3) the player ends up facing LEFT (the
    // direction they moved). The Go Bedroom condition requires facing
    // RIGHT (the player exits east-side of the staircase). So spawn at
    // (2,3) and walk east onto (3,3) facing right.
    await page.evaluate(() => window.A!.teleport!("spyder_paper_rival_downstairs", 2, 3));
    await waitForIdle(page);
    walkTo(page, 3, 3, "right").catch(() => undefined);
    await waitForMap(page, "spyder_paper_rival_bedroom");

    let s = (await getState(page)) as RivalState;
    assert(
      s.player?.tileX === 0 && s.player?.tileY === 3,
      `expected bedroom (0,3), got (${s.player?.tileX},${s.player?.tileY})`,
    );
    assert(
      s.player?.facing === "right",
      `expected facing right (char_face right at teleport tail), got ${s.player?.facing}`,
    );

    // Bedroom dimension/slug sanity.
    const meta = (await page.evaluate(async () => {
      const r = await fetch("/assets/maps/spyder_paper_rival_bedroom.json");
      const m = (await r.json()) as {
        width: number;
        height: number;
        properties?: { name: string; value: unknown }[];
        tilesets: { name: string; firstgid: number }[];
      };
      return {
        width: m.width,
        height: m.height,
        slug: m.properties?.find((p) => p.name === "slug")?.value,
        tilesetCount: m.tilesets.length,
        embeddedTileset: m.tilesets.find((t) => t.name === "Interiors_16x16"),
      };
    })) as {
      width: number;
      height: number;
      slug: string;
      tilesetCount: number;
      embeddedTileset?: { firstgid: number };
    };
    assert(
      meta.width === 7 && meta.height === 7,
      `expected 7x7 bedroom, got ${meta.width}x${meta.height}`,
    );
    assert(meta.slug === "rival_bedroom", `expected slug "rival_bedroom", got "${meta.slug}"`);
    assert(meta.tilesetCount === 4, `expected 4 tilesets, got ${meta.tilesetCount}`);
    assert(
      meta.embeddedTileset?.firstgid === 9279,
      `expected Interiors_16x16 firstgid=9279, got ${meta.embeddedTileset?.firstgid}`,
    );

    await screenshot(page, "paper-rival-bedroom-entry");

    // Round-trip back: bedroom (0,3) facing left → downstairs (3,3) facing left.
    // We're already at (0,3) facing right. Turn left, walk-step onto (0,3)
    // facing left — but we're already on (0,3). The Go Downstairs trigger
    // fires on char_at + char_facing left. We need to step ONTO (0,3) from
    // (1,3) facing left.
    await page.evaluate(() => window.A!.teleport!("spyder_paper_rival_bedroom", 1, 3));
    await waitForIdle(page);
    walkTo(page, 0, 3, "left").catch(() => undefined);
    await waitForMap(page, "spyder_paper_rival_downstairs");
    s = (await getState(page)) as RivalState;
    assert(
      s.player?.tileX === 3 && s.player?.tileY === 3,
      `expected downstairs (3,3), got (${s.player?.tileX},${s.player?.tileY})`,
    );
    assert(s.player?.facing === "left", `expected facing left, got ${s.player?.facing}`);

    console.log("[bedroom stairwell] OK");
  } finally {
    await close();
  }
}

async function testBedroomInteractables(): Promise<void> {
  console.log("[bedroom interactables] launching...");
  const { page, close } = await launchGame();
  try {
    await setupGame(page, { map: "spyder_paper_rival_bedroom", tileX: 4, tileY: 5 });
    await waitForIdle(page);

    // Bed (5,5) width 2 height 2 — face right from (4,5).
    await page.evaluate(() => window.A!.face?.("right"));
    await waitForIdle(page);
    const bedText = await pressUntilDialog(page);
    assert(bedText.length > 0, "expected Bed dialog");
    await dismissDialogs(page);

    // Bookshelf (5,2) width 2 height 1 — face up from (5,3). Move to (5,3).
    await page.evaluate(() => window.A!.teleport!("spyder_paper_rival_bedroom", 5, 3));
    await waitForIdle(page);
    await page.evaluate(() => window.A!.face?.("up"));
    await waitForIdle(page);
    const bookText = await pressUntilDialog(page);
    assert(bookText.length > 0, "expected Bookshelf dialog");
    assert(bookText !== bedText, "expected different dialog from Bed");
    await dismissDialogs(page);

    // Use Computer (2,3) — face up from (2,4).
    await page.evaluate(() => window.A!.teleport!("spyder_paper_rival_bedroom", 2, 4));
    await waitForIdle(page);
    await page.evaluate(() => window.A!.face?.("up"));
    await waitForIdle(page);
    await page.evaluate(() => window.A!.clearEvents?.());
    await interact(page);
    await page.waitForTimeout(300);
    // access_pc is a registered action; assert no crash. We don't check
    // the PC UI state (out of scope per story). Recover by dismissing.
    await dismissDialogs(page).catch(() => undefined);
    const stillAlive = (await getState(page)) as RivalState;
    assert(
      stillAlive.mapKey === "spyder_paper_rival_bedroom",
      "expected to remain on bedroom map after access_pc",
    );

    // Radio (0,5) — face left from (1,5). tune_radio is a no-op stub; no
    // dialog should fire, no crash.
    await page.evaluate(() => window.A!.teleport!("spyder_paper_rival_bedroom", 1, 5));
    await waitForIdle(page);
    await page.evaluate(() => window.A!.face?.("left"));
    await waitForIdle(page);
    await page.evaluate(() => window.A!.clearEvents?.());
    await interact(page);
    await page.waitForTimeout(300);
    const radioEvents = await page.evaluate(() => [...window.A!.events]);
    const radioDialog = radioEvents.find((e) => e.type === "dialog_opened");
    assert(
      !radioDialog,
      `expected no dialog on Radio (tune_radio is no-op stub), got: ${
        radioDialog ? String((radioDialog.data as { text?: string }).text) : ""
      }`,
    );

    // Weights (1,6) — face down from (1,5).
    await page.evaluate(() => window.A!.face?.("down"));
    await waitForIdle(page);
    const weightsText = await pressUntilDialog(page);
    assert(weightsText.length > 0, "expected Weights dialog");
    await dismissDialogs(page);

    console.log("[bedroom interactables] OK");
  } finally {
    await close();
  }
}

async function testOfficeStairwellRoundTrip(): Promise<void> {
  console.log("[office stairwell] launching...");
  const { page, close } = await launchGame();
  try {
    // Downstairs (0,3) facing left → office (6,3) facing left.
    // Walk onto (0,3) from (1,3) facing left.
    await setupGame(page, {
      map: "spyder_paper_rival_downstairs",
      tileX: 1,
      tileY: 3,
    });
    await waitForIdle(page);
    walkTo(page, 0, 3, "left").catch(() => undefined);
    await waitForMap(page, "spyder_paper_rival_office");

    let s = (await getState(page)) as RivalState;
    assert(
      s.player?.tileX === 6 && s.player?.tileY === 3,
      `expected office (6,3), got (${s.player?.tileX},${s.player?.tileY})`,
    );
    assert(s.player?.facing === "left", `expected facing left, got ${s.player?.facing}`);

    // Office dimension/slug + embedded tileset sanity.
    const meta = (await page.evaluate(async () => {
      const r = await fetch("/assets/maps/spyder_paper_rival_office.json");
      const m = (await r.json()) as {
        width: number;
        height: number;
        properties?: { name: string; value: unknown }[];
        tilesets: { name: string; firstgid: number }[];
      };
      return {
        width: m.width,
        height: m.height,
        slug: m.properties?.find((p) => p.name === "slug")?.value,
        tilesetCount: m.tilesets.length,
        embedded: m.tilesets.find((t) => t.name === "Office_interiors_shadowless_16x16"),
      };
    })) as {
      width: number;
      height: number;
      slug: string;
      tilesetCount: number;
      embedded?: { firstgid: number };
    };
    assert(
      meta.width === 7 && meta.height === 7,
      `expected 7x7 office, got ${meta.width}x${meta.height}`,
    );
    assert(meta.slug === "rival_office", `expected slug "rival_office", got "${meta.slug}"`);
    assert(
      meta.embedded?.firstgid === 9279,
      `expected Office_interiors firstgid=9279, got ${meta.embedded?.firstgid}`,
    );

    await screenshot(page, "paper-rival-office-entry");

    // Round-trip back: walk onto (6,3) from (5,3) facing right.
    await page.evaluate(() => window.A!.teleport!("spyder_paper_rival_office", 5, 3));
    await waitForIdle(page);
    walkTo(page, 6, 3, "right").catch(() => undefined);
    await waitForMap(page, "spyder_paper_rival_downstairs");
    s = (await getState(page)) as RivalState;
    assert(
      s.player?.tileX === 0 && s.player?.tileY === 3,
      `expected downstairs (0,3), got (${s.player?.tileX},${s.player?.tileY})`,
    );
    assert(s.player?.facing === "right", `expected facing right, got ${s.player?.facing}`);

    console.log("[office stairwell] OK");
  } finally {
    await close();
  }
}

async function testOfficeHaiku(): Promise<void> {
  console.log("[office haiku] launching...");
  const { page, close } = await launchGame();
  try {
    // Haiku at (2,4) — face up from (2,5).
    await setupGame(page, { map: "spyder_paper_rival_office", tileX: 2, tileY: 5 });
    await waitForIdle(page);
    await page.evaluate(() => window.A!.face?.("up"));
    await waitForIdle(page);
    const text = await pressUntilDialog(page);
    assert(text.length > 0, "expected Haiku dialog");
    await screenshot(page, "paper-rival-office-haiku");
    await dismissDialogs(page);
    console.log("[office haiku] OK");
  } finally {
    await close();
  }
}

async function testFrontDoorExit(): Promise<void> {
  console.log("[downstairs exit] launching...");
  const { page, close } = await launchGame();
  try {
    // Go Outside at (0..2, 11) facing down. Walk onto (1,11) from (1,10).
    await setupGame(page, {
      map: "spyder_paper_rival_downstairs",
      tileX: 1,
      tileY: 10,
    });
    await waitForIdle(page);
    walkTo(page, 1, 11, "down").catch(() => undefined);
    await waitForMap(page, "spyder_paper_town");
    const s = (await getState(page)) as RivalState;
    assert(
      s.player?.tileX === 32 && s.player?.tileY === 6,
      `expected paper_town (32,6), got (${s.player?.tileX},${s.player?.tileY})`,
    );
    assert(s.player?.facing === "down", `expected facing down, got ${s.player?.facing}`);
    await screenshot(page, "paper-rival-downstairs-exit");
    console.log("[downstairs exit] OK");
  } finally {
    await close();
  }
}

async function testTvFlashbackCutscene(): Promise<void> {
  console.log("[tv flashback] launching...");
  const { page, close } = await launchGame();
  try {
    // Force-trigger TV-Yes via billie_tv:yes. The event has no x/y and fires
    // when the gate is set on map entry. Spawn at (4,8) (well clear of any
    // teleport trigger).
    await setupGame(page, {
      map: "spyder_paper_rival_downstairs",
      tileX: 4,
      tileY: 8,
      variables: { billie_tv: "yes" },
    });

    // The cutscene plays 8 dialogs back-to-back with set_template/char_position
    // bookends and ends with clear_variable billie_tv + set_variable flashback:off.
    // Spam interact until billie_tv has been cleared.
    const deadline = Date.now() + 30_000;
    let cleared = false;
    let snappedMid = false;
    while (Date.now() < deadline) {
      const s = (await page
        .evaluate(() => window.A!.getState())
        .catch(() => null)) as RivalState | null;
      if (
        s?.session?.variables &&
        !("billie_tv" in s.session.variables) &&
        s.session.variables.flashback === "off"
      ) {
        cleared = true;
        break;
      }
      if (!snappedMid) {
        const events = await page
          .evaluate(() => [...window.A!.events])
          .catch(() => [] as { type: string }[]);
        if (events.some((e) => e.type === "dialog_opened")) {
          await screenshot(page, "paper-rival-tv-flashback").catch(() => "");
          snappedMid = true;
        }
      }
      await interact(page).catch(() => undefined);
      await page.waitForTimeout(160);
    }
    assert(cleared, "expected billie_tv cleared and flashback=off after TV cutscene");

    console.log("[tv flashback] OK");
  } finally {
    await close();
  }
}

async function testPackageDaycareFlashbackRoundTrip(): Promise<void> {
  console.log("[package-daycare flashback round trip] launching...");
  const { page, close } = await launchGame();
  try {
    // Force billie_grandma:yes — Flashback Yes event fires immediately on map
    // entry, teleporting to spyder_paper_daycare (0,3). The daycare's
    // FlashBack Billie Grandma event (STORY-0212) then runs through ~13 dialog
    // lines and teleports back to rival_downstairs (7,9) with
    // billie_grandma:done + flashback:off.
    await setupGame(page, {
      map: "spyder_paper_rival_downstairs",
      tileX: 4,
      tileY: 8,
      variables: { billie_grandma: "yes" },
    });

    const deadline = Date.now() + 90_000;
    let landedBack = false;
    while (Date.now() < deadline) {
      const s = (await page
        .evaluate(() => window.A!.getState())
        .catch(() => null)) as RivalState | null;
      if (
        s?.mapKey === "spyder_paper_rival_downstairs" &&
        s.session?.variables?.billie_grandma === "done"
      ) {
        landedBack = true;
        break;
      }
      await interact(page).catch(() => undefined);
      await page.waitForTimeout(180);
    }
    assert(
      landedBack,
      "expected to land back at rival_downstairs with billie_grandma=done after daycare flashback",
    );

    const s = (await getState(page)) as RivalState;
    assert(
      s.player?.tileX === 7 && s.player?.tileY === 9,
      `expected rival_downstairs (7,9), got (${s.player?.tileX},${s.player?.tileY})`,
    );
    assert(
      s.session?.variables?.flashback === "off",
      `expected flashback=off, got ${s.session?.variables?.flashback}`,
    );

    await screenshot(page, "paper-rival-package-flashback-return");
    console.log("[package-daycare flashback round trip] OK");
  } finally {
    await close();
  }
}

async function testCollisionSamples(): Promise<void> {
  console.log("[collision sanity] launching...");
  const { page, close } = await launchGame();
  try {
    // Downstairs: sample (8,9) — the 2x2 package block. Stand at (8,8) and
    // try to walk south onto (8,9).
    await setupGame(page, {
      map: "spyder_paper_rival_downstairs",
      tileX: 8,
      tileY: 8,
    });
    await waitForIdle(page);
    await walkTo(page, 8, 9, "down").catch(() => undefined);
    await waitForIdle(page);
    let s = (await getState(page)) as RivalState;
    assert(
      !(s.player?.tileX === 8 && s.player?.tileY === 9),
      "expected (8,9) blocked on downstairs",
    );

    // Bedroom: sample (5,5) — the 2x2 bed block. Stand at (5,4) (inside the
    // top wall is blocked — (0,0,7,3) — so use (4,5)).
    await page.evaluate(() => window.A!.teleport!("spyder_paper_rival_bedroom", 4, 5));
    await waitForIdle(page);
    await walkTo(page, 5, 5, "right").catch(() => undefined);
    await waitForIdle(page);
    s = (await getState(page)) as RivalState;
    assert(
      !(s.player?.tileX === 5 && s.player?.tileY === 5),
      "expected (5,5) blocked on bedroom",
    );

    // Office: sample (2,4) — within the (1,4,4,1) desk rect. Stand at (2,5).
    await page.evaluate(() => window.A!.teleport!("spyder_paper_rival_office", 2, 5));
    await waitForIdle(page);
    await walkTo(page, 2, 4, "up").catch(() => undefined);
    await waitForIdle(page);
    s = (await getState(page)) as RivalState;
    assert(
      !(s.player?.tileX === 2 && s.player?.tileY === 4),
      "expected (2,4) blocked on office",
    );

    console.log("[collision sanity] OK");
  } finally {
    await close();
  }
}

async function main(): Promise<void> {
  await testFrontDoorEntry();
  await testTvAndPackageNoChoice();
  await testBedroomStairwellRoundTrip();
  await testBedroomInteractables();
  await testOfficeStairwellRoundTrip();
  await testOfficeHaiku();
  await testFrontDoorExit();
  await testTvFlashbackCutscene();
  await testPackageDaycareFlashbackRoundTrip();
  await testCollisionSamples();
  console.log("paper-rival-test: OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
