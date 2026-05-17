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

function makeDistractors(answer: number): number[] {
  const set = new Set<number>();
  // Off-by-one errors
  if (answer - 1 >= 0) set.add(answer - 1);
  set.add(answer + 1);
  // Off-by-two
  if (answer - 2 >= 0) set.add(answer - 2);
  set.add(answer + 2);
  set.delete(answer);
  const arr = [...set];
  // Shuffle and take 3
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, 3);
}

const DROPDOWN_PHRASINGS = [
  (a: number, b: number) => `**$${a} - ${b}$ is the same as $${b}$ + [[☃ answer]].**`,
  (a: number, b: number) => `**$${a} - ${b}$ equals $${b}$ + [[☃ answer]].**`,
];

export function generate(): PerseusProblem {
  const minuend = randInt(5, 20);
  const subtrahend = randInt(1, minuend - 1);
  const answer = minuend - subtrahend;

  const id = `1-oa-b4-gen-${++counter}`;

  // ~25% dropdown variant
  if (Math.random() < 0.25) {
    const distractors = makeDistractors(answer);
    const allChoices = [answer, ...distractors];
    // Shuffle choices
    for (let i = allChoices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allChoices[i], allChoices[j]] = [allChoices[j], allChoices[i]];
    }

    const phrasing = pick(DROPDOWN_PHRASINGS)(minuend, subtrahend);
    const widget: ProblemWidget = {
      type: "dropdown",
      options: {
        placeholder: "___",
        choices: allChoices.map((n) => ({
          content: String(n),
          correct: n === answer,
        })),
      },
    };

    return {
      id,
      standard: "1.OA.B.4",
      question: {
        content: phrasing,
        widgets: { answer: widget },
      },
      hints: [
        { content: `Think: what do I add to $${subtrahend}$ to get $${minuend}$?` },
        {
          content: `$${subtrahend} + ${answer} = ${minuend}$, so $${minuend} - ${subtrahend} = ${answer}$.`,
        },
      ],
    };
  }

  const phrasing = pick(PHRASINGS)(minuend, subtrahend);

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
