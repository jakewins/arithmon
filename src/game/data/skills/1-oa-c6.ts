/**
 * Procedural problem generator for 1.OA.C.6:
 * "Add and subtract within 20"
 */
import type { PerseusProblem, ProblemWidget } from "../problems";
import { makeRadioWidget } from "../radio-helpers";

const ADDITION_PHRASINGS = [
  (a: number, b: number) => `**What is $${a} + ${b}$?**`,
  (a: number, b: number) => `**Solve: $${a} + ${b}$**`,
  (a: number, b: number) => `**$${a} + ${b} = {?}$**`,
];

const SUBTRACTION_PHRASINGS = [
  (a: number, b: number) => `**What is $${a} - ${b}$?**`,
  (a: number, b: number) => `**Solve: $${a} - ${b}$**`,
  (a: number, b: number) => `**$${a} - ${b} = {?}$**`,
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function generateAddition(): { a: number; b: number; answer: number; phrasing: string } {
  const a = randInt(1, 19);
  const b = randInt(0, 20 - a);
  return { a, b, answer: a + b, phrasing: pick(ADDITION_PHRASINGS)(a, b) };
}

function generateSubtraction(): { a: number; b: number; answer: number; phrasing: string } {
  const a = randInt(2, 20);
  const b = randInt(1, a);
  return { a, b, answer: a - b, phrasing: pick(SUBTRACTION_PHRASINGS)(a, b) };
}

function additionHint(a: number, b: number, answer: number): { content: string }[] {
  if (b === 0) {
    return [
      { content: `Adding zero doesn't change the number.` },
      { content: `The answer is $${a} + ${b} = ${answer}$.` },
    ];
  }
  return [
    { content: `Try making a ten first.` },
    {
      content: `Count on from the bigger number: start at ${Math.max(a, b)}, then count up ${Math.min(a, b)} more.`,
    },
    { content: `The answer is $${a} + ${b} = ${answer}$.` },
  ];
}

function subtractionHint(a: number, b: number, answer: number): { content: string }[] {
  return [
    { content: `Start at ${a} and count back ${b}.` },
    { content: `The answer is $${a} - ${b} = ${answer}$.` },
  ];
}

let counter = 0;

export function generate(): PerseusProblem {
  const isAddition = Math.random() < 0.5;
  const { a, b, answer, phrasing } = isAddition ? generateAddition() : generateSubtraction();
  const hints = isAddition ? additionHint(a, b, answer) : subtractionHint(a, b, answer);
  const id = `1-oa-c6-gen-${++counter}`;

  const useRadio = Math.random() < 0.3;
  let widget: ProblemWidget;
  let widgetKey: string;

  if (useRadio) {
    widget = makeRadioWidget(answer, 0, 20);
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
    standard: "1.OA.C.6",
    question: {
      content: `${phrasing}\n\n[[☃ ${widgetKey}]]`,
      widgets: { [widgetKey]: widget },
    },
    hints,
  };
}
