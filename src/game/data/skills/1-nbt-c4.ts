/**
 * Procedural problem generator for 1.NBT.C.4:
 * "Add within 100, including adding a two-digit number and a one-digit
 * number, and adding a two-digit number and a multiple of 10."
 *
 * Sub-types:
 * - Two-digit + one-digit: e.g. 34 + 5 = 39 (sum ≤ 99)
 * - Two-digit + multiple of 10: e.g. 23 + 40 = 63 (sum ≤ 99)
 */
import type { PerseusProblem, ProblemWidget } from "../problems";
import { makeRadioWidget } from "../radio-helpers";

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

let counter = 0;

export function generate(): PerseusProblem {
  const isTensVariant = Math.random() < 0.5;
  let a: number;
  let b: number;

  if (isTensVariant) {
    // Two-digit + multiple of 10, sum ≤ 99
    const tens = randInt(1, 8) * 10; // 10, 20, ..., 80
    a = randInt(10, 99 - tens);
    b = tens;
  } else {
    // Two-digit + one-digit, sum ≤ 99
    const ones = randInt(1, 9);
    a = randInt(10, 99 - ones);
    b = ones;
  }

  const answer = a + b;
  const id = `1-nbt-c4-gen-${++counter}`;

  const useRadio = Math.random() < 0.3;
  let widget: ProblemWidget;
  let widgetKey: string;

  if (useRadio) {
    widget = makeRadioWidget(answer, 0, 99);
    widgetKey = "radio 1";
  } else {
    widget = {
      type: "numeric-input",
      options: { answers: [{ value: answer, status: "correct" }] },
    };
    widgetKey = "numeric-input 1";
  }

  const phrasing = Math.random() < 0.5 ? `What is $${a} + ${b}$?` : `Solve: $${a} + ${b}$`;

  const hint = isTensVariant
    ? "Adding tens is like counting by tens."
    : "Add the ones first. Do you need to regroup?";

  return {
    id,
    standard: "1.NBT.C.4",
    question: {
      content: `**${phrasing}**\n\n[[☃ ${widgetKey}]]`,
      widgets: { [widgetKey]: widget },
    },
    hints: [{ content: hint }, { content: `$${a} + ${b} = ${answer}$` }],
  };
}
