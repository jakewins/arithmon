/**
 * Procedural problem generator for K.OA.A.4:
 * "Find the number that makes 10"
 *
 * Generates problems like "? + 6 = 10" or "10 = 3 + ?"
 */
import type { PerseusProblem, ProblemWidget } from "../problems";
import { makeRadioWidget } from "../radio-helpers";

const PHRASINGS = [
  (known: number) => `**What number added to $${known}$ makes $10$?**`,
  (known: number) => `**$? + ${known} = 10$**`,
  (known: number) => `**$10 = ${known} + {?}$**`,
  (known: number) => `**$${known} + ? = 10$**`,
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

let counter = 0;

export function generate(): PerseusProblem {
  const known = Math.floor(Math.random() * 10) + 1; // 1–10
  const answer = 10 - known;
  const phrasing = pick(PHRASINGS)(known);
  const id = `k-oa-a4-gen-${++counter}`;

  const useRadio = Math.random() < 0.3;
  let widget: ProblemWidget;
  let widgetKey: string;

  if (useRadio) {
    widget = makeRadioWidget(answer, 0, 10);
    widgetKey = "radio 1";
  } else {
    widget = {
      type: "numeric-input",
      options: { answers: [{ value: answer, status: "correct" }] },
    };
    widgetKey = "numeric-input 1";
  }

  return {
    id,
    standard: "K.OA.A.4",
    question: {
      content: `${phrasing}\n\n[[☃ ${widgetKey}]]`,
      widgets: { [widgetKey]: widget },
    },
    hints: [
      { content: `Think: what do you add to ${known} to get 10?` },
      { content: `The answer is $${known} + ${answer} = 10$.` },
    ],
  };
}
