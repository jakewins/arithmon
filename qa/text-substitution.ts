/**
 * Regression QA for STORY-0205: `${{name}}` and other Tuxemon-style
 * placeholders in translated dialog must resolve to live session state, and
 * NPC trainer slugs must render as their localized display name.
 *
 * Two screenshots are required by the story:
 *   1. The homemaker dialog (`spyder_papertown_homemaker1`) — body contains
 *      "How are you, Test?" with no literal `${{name}}`.
 *   2. The Billie defeat message in CombatScene — "You defeated Billie!"
 *      with no literal "spyder_billie".
 *
 * Plus a smoke pass that scans every dialog text we open during the run for
 * unresolved `${{` substrings, so a regression in any other placeholder type
 * is caught without us hand-rolling cases for each one.
 */
import {
  launchGame,
  setupGame,
  walkTo,
  waitForIdle,
  waitForEvent,
  getEvents,
  interact,
  screenshot,
} from "./harness";
import type { Page } from "@playwright/test";

interface DialogEvent {
  type: string;
  data: { text?: string };
}

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

async function setPlayerName(page: Page, name: string): Promise<void> {
  await page.evaluate((n) => window.A!.setPlayerName(n), name);
}

/** Walk every captured dialog and fail if any literal ${{...}} survived. */
function assertNoLiteralPlaceholders(events: DialogEvent[]): void {
  const dialogs = events
    .filter((e) => e.type === "dialog_opened")
    .map((e) => String(e.data?.text ?? ""));
  for (const text of dialogs) {
    assert(!text.includes("${{"), `unresolved placeholder in dialog text: ${JSON.stringify(text)}`);
  }
}

// ---------------------------------------------------------------------------
// Symptom A — homemaker dialog renders ${{name}} as the player name.
// ---------------------------------------------------------------------------

async function testHomemakerDialog(): Promise<void> {
  console.log("[symptom A] homemaker dialog");
  const { page, close } = await launchGame();
  try {
    // Spawn next to where "Create Homemaker" places Silver, with a starter so
    // the Stop! blockers don't fire.
    await setupGame(page, {
      map: "spyder_paper_town",
      tileX: 11,
      tileY: 14,
      monsters: [{ slug: "budaye", level: 5 }],
    });
    await setPlayerName(page, "Test");
    await waitForIdle(page);

    // Face the homemaker and interact. The "Talk homemaker" event has a
    // `talk` behaviour, so it fires whenever the player is facing Silver
    // and presses INTERACT, regardless of where the trigger object lives
    // on the map.
    await walkTo(page, 11, 14, "left");
    await waitForIdle(page);
    await page.evaluate(() => window.A!.clearEvents?.());

    await interact(page);
    // Wait for the dialog to open, then take the screenshot BEFORE driving
    // any interacts that would close it. The DialogBox uses a typewriter,
    // so give it a beat to fully render the first page.
    const opened = (await waitForEvent(page, "dialog_opened")) as DialogEvent;
    const rendered = String(opened.data?.text ?? "");
    await page.waitForTimeout(2000);
    await screenshot(page, "text-substitution-homemaker");
    // Drive the dialog to completion so the smoke sweep sees the closed state.
    for (let i = 0; i < 8; i++) {
      await interact(page);
      await page.waitForTimeout(150);
      const evs = (await getEvents(page)) as DialogEvent[];
      if (evs.some((e) => e.type === "dialog_closed")) break;
    }
    await waitForIdle(page);

    assert(
      !rendered.includes("${{"),
      `homemaker dialog still contains literal placeholder: ${JSON.stringify(rendered)}`,
    );
    assert(
      rendered.includes("How are you, Test"),
      `homemaker dialog missing substituted name; got: ${JSON.stringify(rendered)}`,
    );

    // Sweep the entire dialog history for unresolved placeholders.
    assertNoLiteralPlaceholders(((await getEvents(page)) as DialogEvent[]) ?? []);

    console.log("[symptom A] OK — rendered:", JSON.stringify(rendered));
  } finally {
    await close();
  }
}

// ---------------------------------------------------------------------------
// Symptom B — "You defeated spyder_billie!" must render as "Billie".
// ---------------------------------------------------------------------------

async function testBillieDefeatMessage(): Promise<void> {
  console.log("[symptom B] Billie defeat message");
  const { page, close } = await launchGame();
  try {
    await setupGame(page, {
      map: "spyder_paper_town",
      tileX: 23,
      tileY: 13,
      monsters: [{ slug: "rockitten", level: 5 }],
      variables: {
        firstfightdue: "yes",
        mymonchoice: "rockitten",
        billie_choice: "rockitten",
      },
    });

    // "First Fight - Start" auto-fires (no positional gate). Drive dialogs
    // forward until the trainer battle launches.
    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline) {
      const evs = await getEvents(page);
      if (evs.some((e) => e.type === "trainer_battle_started")) break;
      const lastOpen = evs.map((e) => e.type).lastIndexOf("dialog_opened");
      const lastClose = evs.map((e) => e.type).lastIndexOf("dialog_closed");
      if (lastOpen > lastClose) await interact(page);
      await page.waitForTimeout(250);
    }
    const events = await getEvents(page);
    assert(
      events.some((e) => e.type === "trainer_battle_started"),
      "trainer_battle_started never emitted within 60s",
    );

    await page.waitForFunction(
      () => (window.A!.getState() as { scene?: string }).scene === "CombatScene",
      null,
      { timeout: 10_000 },
    );

    // Force-win: drop enemy to 0 HP, then submit any fight action so the
    // machine detects faint and flips outcome=win.
    const techSlug = (await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const scene: any = (window.A as any).getActiveScene();
      return scene?.machine?.player?.techniques?.[0]?.slug ?? null;
    })) as string | null;
    assert(!!techSlug, "no technique slug available to force-win");

    await page.evaluate(() => window.A!.setEnemyHp(0));
    await page.evaluate(
      (slug) => window.A!.submitCombatAction({ type: "fight", technique: slug }),
      techSlug,
    );

    // The end message is written to CombatScene.messageText synchronously
    // before the scene shuts down on a delay. Poll it until "You defeated"
    // appears, then read the final text.
    await page.waitForFunction(
      () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const scene: any = (window.A as any).getActiveScene();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const combat: any = scene?.scene?.get?.("CombatScene") ?? scene;
        const text = combat?.messageText?.text ?? "";
        return typeof text === "string" && text.startsWith("You defeated");
      },
      null,
      { timeout: 15_000 },
    );
    const endMessage = (await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const scene: any = (window.A as any).getActiveScene();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const combat: any = scene?.scene?.get?.("CombatScene") ?? scene;
      return String(combat?.messageText?.text ?? "");
    })) as string;

    await screenshot(page, "text-substitution-billie-defeat");

    assert(
      !endMessage.includes("spyder_billie"),
      `end message still contains raw slug: ${JSON.stringify(endMessage)}`,
    );
    assert(
      endMessage.includes("Billie"),
      `end message missing display name; got: ${JSON.stringify(endMessage)}`,
    );

    console.log("[symptom B] OK — end message:", JSON.stringify(endMessage));
  } finally {
    await close();
  }
}

async function main(): Promise<void> {
  await testHomemakerDialog();
  await testBillieDefeatMessage();
  console.log("text-substitution: OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
