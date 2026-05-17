/**
 * Procedural problem generator for 1.OA.B.4:
 * "Understand subtraction as an unknown-addend problem"
 */
import type { PerseusProblem, ProblemWidget } from "../problems";
import { makeRadioWidget } from "../radio-helpers";

const PHRASINGS = [
  (a: number, b: number) => `**$${a} - ${b} = {?}$** Think: $${b} + {?} = ${a}$`,
  (a: number, b: number) => `**What number added to $${b}$ makes $${a}$?**`,
  (a: number, b: number) => `**$${b} + {?} = ${a}$**`,
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

let counter = 0;

export function generate(): PerseusProblem {
  const minuend = randInt(5, 20);
  const subtrahend = randInt(1, minuend - 1);
  const answer = minuend - subtrahend;

  const phrasing = pick(PHRASINGS)(minuend, subtrahend);
  const id = `1-oa-b4-gen-${++counter}`;

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
    standard: "1.OA.B.4",
    question: {
      content: `${phrasing}\n\n[[☃ ${widgetKey}]]`,
      widgets: { [widgetKey]: widget },
    },
    hints: [
      { content: `Think: what do I add to $${subtrahend}$ to get $${minuend}$?` },
      {
        content: `$${subtrahend} + ${answer} = ${minuend}$, so $${minuend} - ${subtrahend} = ${answer}$.`,
      },
    ],
  };
}
