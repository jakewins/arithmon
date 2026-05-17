/**
 * Procedural problem generator for 1.NBT.C.5:
 * "Given a two-digit number, mentally find 10 more or 10 less than
 * the number, without having to count."
 *
 * Variants:
 * - "What is 10 more than 34?" → numeric-input (44)
 * - "What is 10 less than 56?" → numeric-input (46)
 * - Radio variant with nearby distractors (±1, ±10, ±11)
 * - Number-line variant: "Start at 47. Find 10 more." → number-line widget
 */
import type { PerseusProblem, ProblemWidget } from "../problems";
import { makeRadioWidget } from "../radio-helpers";

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

const NL_PHRASINGS = [
  (base: number, direction: string) => `**Start at $${base}$. Find $10$ ${direction}.**`,
  (base: number, direction: string) =>
    `**Show $10$ ${direction} than $${base}$ on the number line.**`,
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

let counter = 0;

export function generate(): PerseusProblem {
  const isTenMore = Math.random() < 0.5;
  // 10 more: base 10-89 (result 20-99), 10 less: base 20-99 (result 10-89)
  const base = isTenMore ? randInt(10, 89) : randInt(20, 99);
  const answer = isTenMore ? base + 10 : base - 10;
  const direction = isTenMore ? "more" : "less";
  const id = `1-nbt-c5-gen-${++counter}`;

  const roll = Math.random();
  let widget: ProblemWidget;
  let widgetKey: string;
  let phrasing: string;

  if (roll < 0.2) {
    widget = {
      type: "number-line",
      options: { range: [0, 100], step: 10, labelStep: 10, answer },
    };
    widgetKey = "number-line 1";
    phrasing = pick(NL_PHRASINGS)(base, direction);
  } else if (roll < 0.45) {
    widget = makeRadioWidget(answer, 0, 99);
    widgetKey = "radio 1";
    phrasing = `**What is $10$ ${direction} than $${base}$?**`;
  } else {
    widget = {
      type: "numeric-input",
      options: { answers: [{ value: answer, status: "correct" }] },
    };
    widgetKey = "numeric-input 1";
    phrasing = `**What is $10$ ${direction} than $${base}$?**`;
  }

  return {
    id,
    standard: "1.NBT.C.5",
    question: {
      content: `${phrasing}\n\n[[☃ ${widgetKey}]]`,
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
