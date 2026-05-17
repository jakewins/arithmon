/**
 * Procedural problem generator for K.NBT.A.1:
 * "Compose and decompose numbers from 11 to 19 into ten ones and some further ones."
 *
 * Variants:
 * - "N = 10 + ?" → numeric-input
 * - "10 + ? = N" → numeric-input
 * - "How many tens and ones in N?" → dual-input (1 ten, N-10 ones)
 * - "Which shows N?" → radio with choices like "10+3", "10+4", "10+2"
 */
import type { PerseusProblem } from "../problems";
import { shuffle } from "../radio-helpers";

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

let counter = 0;

type Variant = "decompose" | "compose" | "tens-ones" | "radio";
const VARIANTS: Variant[] = ["decompose", "compose", "tens-ones", "radio"];

export function generate(): PerseusProblem {
  const target = randInt(11, 19);
  const ones = target - 10;
  const id = `k-nbt-a1-gen-${++counter}`;
  const variant = VARIANTS[Math.floor(Math.random() * VARIANTS.length)];

  switch (variant) {
    case "decompose":
      // "14 = 10 + ?" → answer is ones part
      return {
        id,
        standard: "K.NBT.A.1",
        question: {
          content: `**$${target} = 10 + \\ ?$**\n\n[[☃ numeric-input 1]]`,
          widgets: {
            "numeric-input 1": {
              type: "numeric-input",
              options: { answers: [{ value: ones, status: "correct" }] },
            },
          },
        },
        hints: [
          { content: "Think of it as one group of ten plus some extra ones." },
          { content: `$${target} = 10 + ${ones}$` },
        ],
      };

    case "compose":
      // "10 + 7 = ?" → answer is target
      return {
        id,
        standard: "K.NBT.A.1",
        question: {
          content: `**$10 + ${ones} = \\ ?$**\n\n[[☃ numeric-input 1]]`,
          widgets: {
            "numeric-input 1": {
              type: "numeric-input",
              options: { answers: [{ value: target, status: "correct" }] },
            },
          },
        },
        hints: [
          { content: "Think of it as one group of ten plus some extra ones." },
          { content: `$10 + ${ones} = ${target}$` },
        ],
      };

    case "tens-ones":
      // "How many tens and ones in 16?" → dual-input (1, 6)
      return {
        id,
        standard: "K.NBT.A.1",
        question: {
          content: `**How many tens and ones in $${target}$?**\n\n[[☃ dual-input 1]]`,
          widgets: {
            "dual-input 1": {
              type: "dual-input",
              options: {
                labels: ["tens", "ones"],
                answers: [{ value: 1 }, { value: ones }],
              },
            },
          },
        },
        hints: [
          { content: "Think of it as one group of ten plus some extra ones." },
          { content: `$${target}$ has $1$ ten and $${ones}$ ones.` },
        ],
      };

    case "radio": {
      // "Which shows 13?" with choices like "10+3", "10+4", "10+2"
      const correctContent = `$10 + ${ones}$`;
      const distractors = new Set<number>();
      for (const offset of [1, -1, 2, -2, 3, -3]) {
        const d = ones + offset;
        if (d >= 1 && d <= 9 && d !== ones) {
          distractors.add(d);
        }
        if (distractors.size >= 3) break;
      }

      const choices = shuffle([
        { content: correctContent, correct: true },
        ...[...distractors].map((d) => ({
          content: `$10 + ${d}$`,
          correct: false,
        })),
      ]);

      return {
        id,
        standard: "K.NBT.A.1",
        question: {
          content: `**Which shows $${target}$?**\n\n[[☃ radio 1]]`,
          widgets: {
            "radio 1": {
              type: "radio",
              options: { choices },
            },
          },
        },
        hints: [
          { content: "Think of it as one group of ten plus some extra ones." },
          { content: `$${target} = 10 + ${ones}$` },
        ],
      };
    }
  }
}
