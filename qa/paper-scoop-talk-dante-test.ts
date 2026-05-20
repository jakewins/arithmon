/**
 * Second-visit smoke test for spyder_paper_scoop (STORY-0197).
 *
 * After the intro cutscene completes, returning to the scoop with an empty
 * party should let the player talk to Dante (who spawns at (11,6) via the
 * post-intro `Create Dante` event) and pick up the `dantefirst:yes` flag
 * that gates STORY-0196's bin sequence in paper_town.
 */
import { launchGame, setupGame, waitForIdle, walkTo, getState, interact } from "./harness";
import type { Page } from "@playwright/test";

interface NpcSnapshot {
  slug: string;
  tileX: number;
  tileY: number;
  facing: string;
}

interface ScoopState {
  mapKey?: string;
  player?: { tileX: number; tileY: number; facing: string };
  session?: { variables?: Record<string, string> };
  npcs: NpcSnapshot[];
}

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

/** Press interact until a dialog opens (typewriter dialogs can take a few presses). */
async function pressUntilDialog(page: Page, maxSteps = 8): Promise<void> {
  await page.evaluate(() => window.A!.clearEvents?.());
  for (let i = 0; i < maxSteps; i++) {
    await interact(page);
    await page.waitForTimeout(150);
    const events = await page.evaluate(() => [...window.A!.events]);
    if (events.some((e) => e.type === "dialog_opened")) return;
  }
  throw new Error(`No dialog after ${maxSteps} interacts`);
}

async function testTalkDanteNoParty(): Promise<void> {
  console.log("[talk dante no party] launching...");
  const { page, close } = await launchGame();
  try {
    // Post-intro state: scoop is "done", choice_phase progressed, billie_choice
    // recorded — exactly what setupGame defaults leave behind. Override the
    // monster list to empty so the `not party_size > 0` gate stays open.
    await setupGame(page, {
      map: "spyder_paper_scoop",
      tileX: 10,
      tileY: 6,
      monsters: [],
      variables: { billie_choice: "budaye" },
    });
    await waitForIdle(page);

    // Verify Dante spawned at (11,6) from the post-intro Create Dante event.
    const initial = (await getState(page)) as unknown as ScoopState;
    const dante = initial.npcs.find((n) => n.slug === "spyder_dante");
    assert(
      !!dante,
      `expected spyder_dante to spawn post-intro, npcs=${JSON.stringify(initial.npcs.map((n) => n.slug))}`,
    );
    assert(
      dante!.tileX === 11 && dante!.tileY === 6,
      `expected Dante at (11,6), got (${dante!.tileX},${dante!.tileY})`,
    );

    // Face Dante from one tile west.
    await walkTo(page, 10, 6, "right");
    await waitForIdle(page);

    // Trigger Talk Dante No Party event.
    await pressUntilDialog(page);

    // Power past the dialog and let the rest of the chain run.
    for (let i = 0; i < 8; i++) {
      await interact(page);
      await page.waitForTimeout(120);
      const events = await page.evaluate(() => [...window.A!.events]);
      if (events.some((e) => e.type === "dialog_closed")) break;
    }
    await waitForIdle(page);

    const after = (await getState(page)) as unknown as ScoopState;
    assert(
      after.session?.variables?.dantefirst === "yes",
      `expected dantefirst=yes after Talk Dante No Party, got ${after.session?.variables?.dantefirst}`,
    );

    console.log("[talk dante no party] OK");
  } finally {
    await close();
  }
}

async function testGoOutsideTeleport(): Promise<void> {
  console.log("[go outside] launching...");
  const { page, close } = await launchGame();
  try {
    await setupGame(page, {
      map: "spyder_paper_scoop",
      tileX: 6,
      tileY: 9,
      monsters: [],
    });
    await waitForIdle(page);

    // Step south onto (6,10) — the Go Outside trigger tile. The teleport
    // fires the same frame as walkTo finishes; the scene restart can tear
    // down the evaluate context mid-promise, so swallow that error and just
    // poll for the new mapKey instead.
    await walkTo(page, 6, 10, "down").catch(() => undefined);
    await page.waitForTimeout(1000);
    await waitForIdle(page).catch(() => undefined);

    const after = (await getState(page)) as unknown as ScoopState;
    assert(
      after.mapKey === "spyder_paper_town",
      `expected to land in spyder_paper_town, got ${after.mapKey}`,
    );
    assert(
      after.player?.tileX === 19 && after.player?.tileY === 13,
      `expected to land at (19,13) in paper_town, got (${after.player?.tileX},${after.player?.tileY})`,
    );

    console.log("[go outside] OK");
  } finally {
    await close();
  }
}

async function main(): Promise<void> {
  await testTalkDanteNoParty();
  await testGoOutsideTeleport();
  console.log("paper-scoop-talk-dante-test: OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
