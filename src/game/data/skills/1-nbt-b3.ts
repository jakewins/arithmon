/**
 * Procedural problem generator for 1.NBT.B.3:
 * "Compare two two-digit numbers based on meanings of the tens and
 * ones digits, recording the results of comparisons with the symbols >, =, and <."
 *
 * Uses the comparison widget — presents two numbers and asks the student
 * to pick >, =, or <.
 */
import type { PerseusProblem } from "../problems";

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

let counter = 0;

type Variant = "tens-differ" | "ones-differ" | "equal";

function pickVariant(): Variant {
  const r = Math.random();
  if (r < 0.4) return "tens-differ";
  if (r < 0.8) return "ones-differ";
  return "equal";
}

function compare(a: number, b: number): ">" | "=" | "<" {
  if (a > b) return ">";
  if (a < b) return "<";
  return "=";
}

export function generate(): PerseusProblem {
  const id = `1-nbt-b3-gen-${++counter}`;
  const variant = pickVariant();

  let left: number;
  let right: number;

  switch (variant) {
    case "tens-differ": {
      // Ensure tens digits are different
      const tensA = randInt(1, 9);
      let tensB = randInt(1, 9);
      while (tensB === tensA) tensB = randInt(1, 9);
      const onesA = randInt(0, 9);
      const onesB = randInt(0, 9);
      left = tensA * 10 + onesA;
      right = tensB * 10 + onesB;
      break;
    }
    case "ones-differ": {
      // Same tens digit, different ones
      const tens = randInt(1, 9);
      const onesA = randInt(0, 9);
      let onesB = randInt(0, 9);
      while (onesB === onesA) onesB = randInt(0, 9);
      left = tens * 10 + onesA;
      right = tens * 10 + onesB;
      break;
    }
    case "equal": {
      left = randInt(10, 99);
      right = left;
      break;
    }
  }

  const answer = compare(left, right);

  const phrasings = [
    `**Compare: $${left}$ ○ $${right}$**`,
    `**Which symbol goes between $${left}$ and $${right}$?**`,
  ];
  const phrasing = phrasings[Math.floor(Math.random() * phrasings.length)];

  return {
    id,
    standard: "1.NBT.B.3",
    question: {
      content: `${phrasing}\n\n[[☃ comparison 1]]`,
      widgets: {
        "comparison 1": {
          type: "comparison",
          options: {
            left: String(left),
            right: String(right),
            answer,
          },
        },
      },
    },
    hints: [
      {
        content: "First compare the tens. If the tens are the same, compare the ones.",
      },
      { content: `$${left} ${answer} ${right}$` },
    ],
  };
}
