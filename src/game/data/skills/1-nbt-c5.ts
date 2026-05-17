/**
 * Procedural problem generator for 1.NBT.C.5:
 * "Given a two-digit number, mentally find 10 more or 10 less than
 * the number, without having to count."
 *
 * Variants:
 * - "What is 10 more than 34?" → numeric-input (44)
 * - "What is 10 less than 56?" → numeric-input (46)
 * - Radio variant with nearby distractors (±1, ±10, ±11)
 */
import type { PerseusProblem, ProblemWidget } from "../problems";
import { makeRadioWidget } from "../radio-helpers";

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

let counter = 0;

export function generate(): PerseusProblem {
  const isTenMore = Math.random() < 0.5;
  // 10 more: base 10-89 (result 20-99), 10 less: base 20-99 (result 10-89)
  const base = isTenMore ? randInt(10, 89) : randInt(20, 99);
  const answer = isTenMore ? base + 10 : base - 10;
  const direction = isTenMore ? "more" : "less";
  const id = `1-nbt-c5-gen-${++counter}`;

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

  return {
    id,
    standard: "1.NBT.C.5",
    question: {
      content: `**What is $10$ ${direction} than $${base}$?**\n\n[[☃ ${widgetKey}]]`,
      widgets: { [widgetKey]: widget },
    },
    hints: [
      {
        content: `When you ${isTenMore ? "add" : "subtract"} 10, only the tens digit changes. The ones digit stays the same.`,
      },
      { content: `$${base} ${isTenMore ? "+" : "-"} 10 = ${answer}$` },
    ],
  };
}
