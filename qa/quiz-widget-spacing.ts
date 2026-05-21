/**
 * QA: MathProblemScene widget spacing (STORY-0226).
 *
 * For each of the six widget types (numeric-input, radio, dual-input,
 * comparison, number-line, dropdown) we drive `showProblem` twice — once
 * with a short one-line question, once with a long question that wraps
 * to two lines — and screenshot the rendered scene before the answer is
 * submitted. The reviewer eyeballs each of the 12 screenshots to confirm:
 *
 *   - There is no pixel overlap between the question text's bottom edge
 *     and the widget's first visible element (label / box / button).
 *   - SUBMIT / HINT buttons and the feedback line all fit inside the panel.
 *
 * The script also auto-submits a wrong answer between problems so the
 * scene's 2-second auto-close runs and we get a clean MathProblemScene
 * for the next case.
 */

import { launchGame, setupGame, showProblem, screenshot } from "./harness";
import type { Page } from "@playwright/test";
import type { PerseusProblem } from "../src/game/data/problems";

const SHORT_Q = "What is 7 + 5?";
const LONG_Q =
  "If you have twelve apples and give away five of them to your friend, " +
  "how many apples are left?";

async function waitForScene(page: Page, name: string, timeoutMs = 5000): Promise<void> {
  await page.waitForFunction(
    (n) => (window.A!.getState() as { scene?: string }).scene === n,
    name,
    { timeout: timeoutMs },
  );
}

/** One problem per widget type, parameterized on the question text. */
function buildProblem(widget: string, question: string): PerseusProblem {
  switch (widget) {
    case "numeric-input":
      return {
        id: `qa-spacing-numeric-${question.length}`,
        standard: "1.OA.A.1",
        question: {
          content: question,
          widgets: {
            "n-input 1": {
              type: "numeric-input",
              options: { answers: [{ value: 12, status: "correct" }] },
            },
          },
        },
        hints: [{ content: "Count up from 7." }],
      };

    case "radio":
      return {
        id: `qa-spacing-radio-${question.length}`,
        standard: "1.OA.A.1",
        question: {
          content: question,
          widgets: {
            "radio 1": {
              type: "radio",
              options: {
                choices: [
                  { content: "10", correct: false },
                  { content: "11", correct: false },
                  { content: "12", correct: true },
                  { content: "13", correct: false },
                ],
              },
            },
          },
        },
        hints: [{ content: "It's between 11 and 13." }],
      };

    case "dual-input":
      return {
        id: `qa-spacing-dual-${question.length}`,
        standard: "1.NBT.B.2",
        question: {
          content: question,
          widgets: {
            "dual 1": {
              type: "dual-input",
              options: {
                labels: ["tens", "ones"],
                answers: [{ value: 1 }, { value: 7 }],
              },
            },
          },
        },
        hints: [{ content: "Break 17 into tens and ones." }],
      };

    case "comparison":
      return {
        id: `qa-spacing-comparison-${question.length}`,
        standard: "1.NBT.B.3",
        question: {
          content: question,
          widgets: {
            "comp 1": {
              type: "comparison",
              options: { left: "12", right: "7", answer: ">" },
            },
          },
        },
        hints: [{ content: "Which number is bigger?" }],
      };

    case "number-line":
      return {
        id: `qa-spacing-numberline-${question.length}`,
        standard: "2.MD.B.6",
        question: {
          content: question,
          widgets: {
            "nl 1": {
              type: "number-line",
              options: { range: [0, 20], step: 1, labelStep: 5, answer: 12 },
            },
          },
        },
        hints: [{ content: "Drag the marker." }],
      };

    case "dropdown":
      return {
        id: `qa-spacing-dropdown-${question.length}`,
        standard: "1.OA.D.7",
        question: {
          content: question,
          widgets: {
            "dd 1": {
              type: "dropdown",
              options: {
                placeholder: "pick one",
                choices: [
                  { content: "less", correct: false },
                  { content: "equal", correct: false },
                  { content: "greater", correct: true },
                ],
              },
            },
          },
        },
        hints: [{ content: "12 vs 7." }],
      };

    default:
      throw new Error(`unknown widget type: ${widget}`);
  }
}

/**
 * Show one problem, screenshot it pre-submit, force an obviously-wrong
 * answer so the scene's 2-second auto-close fires, then wait for the
 * scene to disappear.
 */
async function runCase(page: Page, widget: string, label: "short" | "long"): Promise<void> {
  const question = label === "short" ? SHORT_Q : LONG_Q;
  const problem = buildProblem(widget, question);
  await showProblem(page, problem);
  await waitForScene(page, "MathProblemScene");
  // ~200 ms for fonts/layout to settle.
  await page.waitForTimeout(200);
  await screenshot(page, `quiz-spacing-${widget}-${label}`);

  // Submit a deliberately wrong answer so the scene auto-closes in 2 s.
  await page.evaluate((w) => {
    switch (w) {
      case "numeric-input":
        window.A!.typeAnswer("0");
        window.A!.submitAnswer();
        break;
      case "radio":
        // index 0 is wrong (10 != 12).
        window.A!.typeAnswer("0");
        window.A!.submitAnswer();
        break;
      case "dual-input":
        window.A!.typeAnswer("9,9");
        window.A!.submitAnswer();
        break;
      case "comparison":
        // index 2 = "<" — wrong for 12 > 7.
        window.A!.typeAnswer("2");
        window.A!.submitAnswer();
        break;
      case "number-line":
        // marker defaults to 0, wrong for answer=12.
        window.A!.submitAnswer();
        break;
      case "dropdown":
        // index 0 = "less" — wrong.
        window.A!.typeAnswer("0");
        window.A!.submitAnswer();
        break;
    }
  }, widget);
  // 2 s auto-close + 200 ms buffer.
  await page.waitForTimeout(2200);
}

async function main(): Promise<void> {
  const { page, close } = await launchGame();
  try {
    await setupGame(page);

    const widgets = [
      "numeric-input",
      "radio",
      "dual-input",
      "comparison",
      "number-line",
      "dropdown",
    ];
    for (const w of widgets) {
      await runCase(page, w, "short");
      await runCase(page, w, "long");
    }
  } finally {
    await close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
