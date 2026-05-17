/**
 * Procedural problem generator for 1.OA.D.7:
 * "Understand the meaning of the equal sign, and determine if equations
 * involving addition and subtraction are true or false."
 */
import type { PerseusProblem, RadioWidget } from "../problems";
import { shuffle } from "../radio-helpers";

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

type Equation = { left: string; right: string; isTrue: boolean };

function generateTrueEquation(): Equation {
  const form = pick(["identity", "commutative", "both-sides", "simple-eq"]);
  switch (form) {
    case "identity": {
      const a = randInt(1, 20);
      return { left: `${a}`, right: `${a}`, isTrue: true };
    }
    case "commutative": {
      const a = randInt(1, 10);
      const b = randInt(1, 10);
      return { left: `${a} + ${b}`, right: `${b} + ${a}`, isTrue: true };
    }
    case "both-sides": {
      const sum = randInt(3, 15);
      const a = randInt(1, sum - 1);
      const b = sum - a;
      const c = randInt(1, sum - 1);
      const d = sum - c;
      return { left: `${a} + ${b}`, right: `${c} + ${d}`, isTrue: true };
    }
    case "simple-eq": {
      const a = randInt(2, 15);
      const b = randInt(1, a - 1);
      const c = a - b;
      return { left: `${a}`, right: `${b} + ${c}`, isTrue: true };
    }
  }
  // unreachable but satisfies TS
  return { left: "1", right: "1", isTrue: true };
}

function generateFalseEquation(): Equation {
  const eq = generateTrueEquation();
  // Perturb the right side by 1 or 2
  const offset = pick([1, -1, 2, -2]);
  const rightParts = eq.right.match(/^(\d+)\s*\+\s*(\d+)$/);
  if (rightParts) {
    const newVal = parseInt(rightParts[2]) + offset;
    if (newVal >= 0 && newVal <= 20) {
      return { left: eq.left, right: `${rightParts[1]} + ${newVal}`, isTrue: false };
    }
  }
  // For identity/simple forms, just change the right number
  const rightNum = parseInt(eq.right);
  if (!isNaN(rightNum)) {
    const newRight = rightNum + offset;
    if (newRight >= 0 && newRight <= 20) {
      return { left: eq.left, right: `${newRight}`, isTrue: false };
    }
  }
  // Fallback: simple obvious false
  const a = randInt(1, 18);
  return { left: `${a}`, right: `${a + pick([1, 2])}`, isTrue: false };
}

let counter = 0;

export function generate(): PerseusProblem {
  const isTrue = Math.random() < 0.5;
  const eq = isTrue ? generateTrueEquation() : generateFalseEquation();
  const id = `1-oa-d7-gen-${++counter}`;

  const widget: RadioWidget = {
    type: "radio",
    options: {
      choices: shuffle([
        { content: "True", correct: eq.isTrue },
        { content: "False", correct: !eq.isTrue },
      ]),
    },
  };

  return {
    id,
    standard: "1.OA.D.7",
    question: {
      content: `**Is this equation true or false?**\n\n$$${eq.left} = ${eq.right}$$\n\n[[☃ radio 1]]`,
      widgets: { "radio 1": widget },
    },
    hints: [
      { content: `Work out each side separately. Do they give the same number?` },
      {
        content: eq.isTrue
          ? `Both sides equal the same value, so the equation is **true**.`
          : `The two sides give different values, so the equation is **false**.`,
      },
    ],
  };
}
