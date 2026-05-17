/**
 * Procedural problem generator for 1.NBT.B.2:
 * "Understand that the two digits of a two-digit number represent
 * amounts of tens and ones."
 *
 * Variants:
 * - "How many tens and ones in 47?" → dual-input (4 tens, 7 ones)
 * - "What number has 3 tens and 5 ones?" → numeric-input (35)
 * - "Which shows 62?" → radio with choices like "6 tens 2 ones", etc.
 */
import type { PerseusProblem } from "../problems";
import { shuffle } from "../radio-helpers";

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

let counter = 0;

type Variant = "tens-ones" | "compose" | "radio";
const VARIANTS: Variant[] = ["tens-ones", "compose", "radio"];

export function generate(): PerseusProblem {
  const target = randInt(10, 99);
  const tens = Math.floor(target / 10);
  const ones = target % 10;
  const id = `1-nbt-b2-gen-${++counter}`;
  const variant = VARIANTS[Math.floor(Math.random() * VARIANTS.length)];

  switch (variant) {
    case "tens-ones":
      // "How many tens and ones in 47?" → dual-input (4, 7)
      return {
        id,
        standard: "1.NBT.B.2",
        question: {
          content: `**How many tens and ones in $${target}$?**\n\n[[☃ dual-input 1]]`,
          widgets: {
            "dual-input 1": {
              type: "dual-input",
              options: {
                labels: ["tens", "ones"],
                answers: [{ value: tens }, { value: ones }],
              },
            },
          },
        },
        hints: [
          {
            content:
              "The first digit tells you how many tens. The second digit tells you how many ones.",
          },
          { content: `$${target}$ has $${tens}$ tens and $${ones}$ ones.` },
        ],
      };

    case "compose":
      // "What number has 3 tens and 5 ones?" → numeric-input (35)
      return {
        id,
        standard: "1.NBT.B.2",
        question: {
          content: `**What number has $${tens}$ tens and $${ones}$ ones?**\n\n[[☃ numeric-input 1]]`,
          widgets: {
            "numeric-input 1": {
              type: "numeric-input",
              options: { answers: [{ value: target, status: "correct" }] },
            },
          },
        },
        hints: [
          {
            content:
              "The first digit tells you how many tens. The second digit tells you how many ones.",
          },
          { content: `$${tens}$ tens and $${ones}$ ones $= ${target}$` },
        ],
      };

    case "radio": {
      // "Which shows 62?" with choices like "6 tens 2 ones", "2 tens 6 ones", etc.
      const correctContent = `$${tens}$ tens $${ones}$ ones`;
      const distractorPairs = new Set<string>();

      // Swap digits
      if (ones !== tens) {
        distractorPairs.add(`${ones},${tens}`);
      }
      // Off-by-one on tens
      for (const offset of [1, -1]) {
        const dt = tens + offset;
        if (dt >= 0 && dt <= 9) {
          distractorPairs.add(`${dt},${ones}`);
        }
      }
      // Off-by-one on ones
      for (const offset of [1, -1]) {
        const d = ones + offset;
        if (d >= 0 && d <= 9) {
          const key = `${tens},${d}`;
          if (key !== `${tens},${ones}`) {
            distractorPairs.add(key);
          }
        }
      }

      const distractors = [...distractorPairs].slice(0, 3).map((pair) => {
        const [t, o] = pair.split(",").map(Number);
        return { content: `$${t}$ tens $${o}$ ones`, correct: false };
      });

      const choices = shuffle([{ content: correctContent, correct: true }, ...distractors]);

      return {
        id,
        standard: "1.NBT.B.2",
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
          {
            content:
              "The first digit tells you how many tens. The second digit tells you how many ones.",
          },
          { content: `$${target} = ${tens}$ tens and $${ones}$ ones` },
        ],
      };
    }
  }
}
