// Regression QA for STORY-0204: choosing Recharge in combat must open the
// math problem scene without throwing, and grading the answer must return
// control to CombatScene with DP updated correctly.
//
// Repros the original bug path (TitleScene -> New Game -> clearSave ->
// resetSession replaces session.skillStates) before draining DP, opening the
// recharge submenu, and answering one problem correctly and one incorrectly.
import {
  launchGame,
  setupGame,
  typeAnswer,
  submitAnswer,
  waitForEvent,
  screenshot,
  getState,
} from "./harness";
import type { Page } from "@playwright/test";

interface CombatState {
  menuMode: string;
  darkPower: number;
  maxDarkPower: number;
}

/**
 * Read CombatScene's debug state directly from its scene reference rather
 * than via the debug bridge's active scene. The bridge only updates its
 * pointer in create(), so once MathProblemScene takes over and resumes
 * CombatScene, getState() still routes to the now-stale Math reference
 * until something else calls setScene. Reading the combat scene directly
 * sidesteps that.
 */
async function getCombatState(page: Page): Promise<CombatState> {
  return page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scene: any = (window.A as any).getActiveScene();
    if (scene?.scene?.key === "CombatScene") {
      return scene.getDebugState().combat as CombatState;
    }
    // Fall back to looking up the CombatScene instance directly via Phaser.
    const phaserScene = scene?.scene?.get?.("CombatScene");
    if (phaserScene && typeof phaserScene.getDebugState === "function") {
      return phaserScene.getDebugState().combat as CombatState;
    }
    throw new Error("CombatScene not reachable from debug bridge");
  });
}

async function setupBattleWithEmptyDP(page: Page) {
  await page.evaluate(async () => {
    // Trigger TitleScene's "New Game" action so clearSave() -> resetSession()
    // runs — this is the original bug trigger and *must* happen before
    // setupGame seeds a party.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scene: any = (window.A as any).getActiveScene();
    if (scene?.scene?.key === "TitleScene") {
      scene.debugSelectChoice?.(0);
      scene.debugSetInteract?.();
    }
  });
  await setupGame(page, {});

  await page.evaluate(() => window.A!.spawnBattle("rockitten", "rockitten", 10, 10, "grass"));
  await page.waitForFunction(
    () => {
      const s = window.A!.getState() as { combat?: { menuMode?: string } };
      return s.combat?.menuMode === "main";
    },
    null,
    { timeout: 15_000 },
  );

  // Drain DP, lock enemy alive so the battle stays open across rounds.
  await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const active: any = (window.A as any).getActiveScene();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const combat: any = active?.scene?.get?.("CombatScene");
    if (!combat?.machine) throw new Error("CombatScene not reachable to drain DP");
    combat.machine.darkPower = 0;
    combat.updateDpPips?.();
    window.A!.setEnemyHp(999);
  });
}

/**
 * Open the Fight submenu and click the Recharge row by calling CombatScene's
 * debug command handler directly. Avoids relying on the debug bridge's
 * active-scene pointer, which gets stale across MathProblemScene swaps.
 */
async function pickRecharge(page: Page) {
  await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const active: any = (window.A as any).getActiveScene();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const combat: any = active?.scene?.get?.("CombatScene");
    if (!combat) throw new Error("CombatScene not reachable");
    combat.debugSelectChoice(0); // FIGHT
  });
  await page.waitForFunction(
    () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const active: any = (window.A as any).getActiveScene();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const combat: any = active?.scene?.get?.("CombatScene");
      return combat?.getDebugState?.().combat?.menuMode === "techniques";
    },
    null,
    { timeout: 5_000 },
  );
  await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const active: any = (window.A as any).getActiveScene();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const combat: any = active?.scene?.get?.("CombatScene");
    const techCount = combat.getVisibleTechniques().length;
    combat.debugSelectChoice(techCount); // last row = Recharge
  });
}

interface ProblemAnswer {
  widgetType: string;
  /** String to feed into typeAnswer for the correct answer. */
  correctText: string;
  /** String to feed into typeAnswer for a deliberately-wrong answer. */
  wrongText: string;
}

/**
 * Inspect the active math problem and compute the answer strings to feed via
 * the debug bridge. K.OA.A.5 (the only initially-unlocked node) emits either
 * a radio or a numeric-input widget, so we cover both.
 */
async function probeProblemAnswers(page: Page): Promise<ProblemAnswer> {
  return page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scene: any = (window.A as any).getActiveScene();
    const widget = Object.values(scene.problem.question.widgets)[0] as
      | {
          type: "radio";
          options: { choices: { content: string; correct: boolean }[] };
        }
      | {
          type: "numeric-input";
          options: { answers: { value: number; status: string }[] };
        };
    if (widget.type === "radio") {
      const idx = widget.options.choices.findIndex((c) => c.correct);
      const wrong = idx === 0 ? 1 : 0;
      return { widgetType: widget.type, correctText: String(idx), wrongText: String(wrong) };
    }
    if (widget.type === "numeric-input") {
      const correct = widget.options.answers.find((a) => a.status === "correct");
      if (!correct) throw new Error("numeric-input widget has no correct answer");
      const wrongVal = correct.value === 0 ? 999 : correct.value + 1;
      return {
        widgetType: widget.type,
        correctText: String(correct.value),
        wrongText: String(wrongVal),
      };
    }
    throw new Error(`unsupported widget type for K.OA.A.5: ${(widget as { type: string }).type}`);
  });
}

/** Answer the current math problem using a debug-bridge text payload. */
async function answer(page: Page, text: string) {
  await typeAnswer(page, text);
  await submitAnswer(page);
}

/**
 * Wait for MathProblemScene to fully shut down and CombatScene to resume
 * back into the main attack menu. The debug bridge's active-scene pointer
 * doesn't update on resume, so we ask the CombatScene reference directly.
 */
async function waitForReturnToCombat(page: Page) {
  await page.waitForFunction(
    () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const scene: any = (window.A as any).getActiveScene();
      const combat = scene?.scene?.get?.("CombatScene");
      if (!combat || typeof combat.getDebugState !== "function") return false;
      const state = combat.getDebugState();
      return state.combat?.menuMode === "main";
    },
    null,
    { timeout: 10_000 },
  );
}

async function main() {
  const { page, close } = await launchGame();
  try {
    await setupBattleWithEmptyDP(page);

    // --- 1. Correct answer: DP must recharge ---
    await pickRecharge(page);
    await waitForEvent(page, "scene_started"); // MathProblemScene
    await page.waitForFunction(
      () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const scene: any = (window.A as any).getActiveScene();
        return scene?.scene?.key === "MathProblemScene" && scene.problem;
      },
      null,
      { timeout: 5_000 },
    );

    // Sanity: debug bridge exposes the active problem.
    const debugState = (await getState(page)) as {
      mathProblem?: { problemId?: string };
    };
    if (!debugState.mathProblem?.problemId) {
      throw new Error("debug bridge did not expose mathProblem.problemId");
    }

    // Proof-of-render screenshot — reviewers can confirm a real question is
    // visible (question text + answer widget, not a black screen or overlay).
    const shot = await screenshot(page, "combat-recharge-math");
    console.log("math quiz screenshot:", shot);

    const a1 = await probeProblemAnswers(page);
    console.log("Q1 widget:", a1.widgetType, "correct:", a1.correctText);
    await answer(page, a1.correctText);
    await waitForReturnToCombat(page);

    let combat = await getCombatState(page);
    if (combat.darkPower !== combat.maxDarkPower) {
      throw new Error(
        `Correct answer should refill DP to ${combat.maxDarkPower}, got ${combat.darkPower}`,
      );
    }
    console.log("Correct answer -> DP refilled to", combat.darkPower);

    // --- 2. Wrong answer: DP must stay drained ---
    await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const active: any = (window.A as any).getActiveScene();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const combat: any = active?.scene?.get?.("CombatScene");
      if (!combat?.machine) throw new Error("CombatScene not reachable to drain DP");
      combat.machine.darkPower = 0;
      combat.updateDpPips?.();
    });

    // CombatScene is already back in "main" — confirmed by waitForReturnToCombat
    // above. No additional wait needed.

    await pickRecharge(page);
    await waitForEvent(page, "scene_started");
    await page.waitForFunction(
      () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const scene: any = (window.A as any).getActiveScene();
        return scene?.scene?.key === "MathProblemScene" && scene.problem;
      },
      null,
      { timeout: 5_000 },
    );

    const a2 = await probeProblemAnswers(page);
    console.log("Q2 widget:", a2.widgetType, "wrong:", a2.wrongText);
    await answer(page, a2.wrongText);
    await waitForReturnToCombat(page);

    combat = await getCombatState(page);
    if (combat.darkPower !== 0) {
      throw new Error(`Wrong answer should leave DP at 0, got ${combat.darkPower}`);
    }
    console.log("Wrong answer -> DP stays at 0");

    console.log("STORY-0204 regression: PASS");
  } finally {
    await close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
