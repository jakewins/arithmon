/**
 * Procedural problem generator for 1.OA.D.8:
 * "Determine the unknown whole number in an addition or subtraction
 * equation relating three whole numbers."
 */
import type { PerseusProblem, ProblemWidget } from "../problems";
import { makeRadioWidget } from "../radio-helpers";

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

type Form =
  | "add-missing-second"
  | "add-missing-first"
  | "sub-missing-sub"
  | "sub-missing-min"
  | "add-missing-sum"
  | "sub-missing-diff";

interface Equation {
  display: string;
  answer: number;
  form: Form;
}

function generateEquation(): Equation {
  const form = pick<Form>([
    "add-missing-second",
    "add-missing-first",
    "sub-missing-sub",
    "sub-missing-min",
    "add-missing-sum",
    "sub-missing-diff",
  ]);

  const blank = pick(["?", "\\_"]);

  switch (form) {
    case "add-missing-second": {
      // a + ? = c
      const c = randInt(2, 20);
      const a = randInt(0, c);
      const answer = c - a;
      return { display: `$${a} + ${blank} = ${c}$`, answer, form };
    }
    case "add-missing-first": {
      // ? + b = c
      const c = randInt(2, 20);
      const b = randInt(0, c);
      const answer = c - b;
      return { display: `$${blank} + ${b} = ${c}$`, answer, form };
    }
    case "sub-missing-sub": {
      // a - ? = c
      const a = randInt(2, 20);
      const c = randInt(0, a);
      const answer = a - c;
      return { display: `$${a} - ${blank} = ${c}$`, answer, form };
    }
    case "sub-missing-min": {
      // ? - b = c
      const b = randInt(1, 19);
      const c = randInt(0, 20 - b);
      const answer = b + c;
      return { display: `$${blank} - ${b} = ${c}$`, answer, form };
    }
    case "add-missing-sum": {
      // a + b = ?
      const sum = randInt(2, 20);
      const a = randInt(0, sum);
      const b = sum - a;
      return { display: `$${a} + ${b} = ${blank}$`, answer: sum, form };
    }
    case "sub-missing-diff": {
      // a - b = ?
      const a = randInt(2, 20);
      const b = randInt(0, a);
      const answer = a - b;
      return { display: `$${a} - ${b} = ${blank}$`, answer, form };
    }
  }
}

let counter = 0;

export function generate(): PerseusProblem {
  const eq = generateEquation();
  const id = `1-oa-d8-gen-${++counter}`;

  const useRadio = Math.random() < 0.3;
  let widget: ProblemWidget;
  let widgetKey: string;

  if (useRadio) {
    widget = makeRadioWidget(eq.answer, 0, 20);
    widgetKey = "radio 1";
  } else {
    widget = {
      type: "numeric-input",
      options: { answers: [{ value: eq.answer, status: "correct" }] },
    };
    widgetKey = "numeric-input 1";
  }

  return {
    id,
    standard: "1.OA.D.8",
    question: {
      content: `**Find the missing number:**\n\n${eq.display}\n\n[[☃ ${widgetKey}]]`,
      widgets: { [widgetKey]: widget },
    },
    hints: [
      {
        content: `Cover the ${eq.display.includes("?") ? "?" : "\\_"} and think about what number makes both sides equal.`,
      },
      { content: `The missing number is **${eq.answer}**.` },
    ],
  };
}
