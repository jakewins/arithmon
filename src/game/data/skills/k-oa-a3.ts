/**
 * Procedural problem generator for K.OA.A.3:
 * "Decompose numbers less than or equal to 10 into pairs"
 *
 * Multiple-choice only for now: "Which pair makes N?"
 */
import type { PerseusProblem } from "../problems";
import { shuffle } from "../radio-helpers";

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/**
 * Generate a set of pair choices for a target number.
 * One correct pair, plus 2–3 incorrect pairs.
 */
function generatePairs(target: number): { correct: [number, number]; wrong: [number, number][] } {
  // Pick a random valid decomposition as the correct one
  const a = randInt(1, target - 1);
  const correct: [number, number] = [a, target - a];

  // Generate wrong pairs that don't sum to target
  const wrong: [number, number][] = [];
  const seen = new Set<string>();
  seen.add(`${correct[0]}+${correct[1]}`);

  const attempts = [
    // off-by-one from correct pair
    [correct[0] + 1, correct[1]] as [number, number],
    [correct[0], correct[1] + 1] as [number, number],
    [correct[0] - 1, correct[1]] as [number, number],
    [correct[0], correct[1] - 1] as [number, number],
    // random pairs that don't sum to target
    ...Array.from({ length: 6 }, (): [number, number] => {
      const x = randInt(1, 9);
      const y = randInt(1, 9);
      return [x, y];
    }),
  ];

  for (const pair of attempts) {
    if (wrong.length >= 3) break;
    const [x, y] = pair;
    if (x < 0 || y < 0 || x > 10 || y > 10) continue;
    if (x + y === target) continue;
    const key = `${x}+${y}`;
    if (seen.has(key)) continue;
    seen.add(key);
    wrong.push([x, y]);
  }

  return { correct, wrong };
}

let counter = 0;

export function generate(): PerseusProblem {
  const target = randInt(2, 10);
  const { correct, wrong } = generatePairs(target);
  const id = `k-oa-a3-gen-${++counter}`;

  const correctContent = `${correct[0]} + ${correct[1]}`;
  const choices = shuffle([
    { content: correctContent, correct: true },
    ...wrong.map((pair) => ({
      content: `${pair[0]} + ${pair[1]}`,
      correct: false,
    })),
  ]);

  return {
    id,
    standard: "K.OA.A.3",
    question: {
      content: `**Which pair of numbers makes $${target}$?**\n\n[[☃ radio 1]]`,
      widgets: {
        "radio 1": {
          type: "radio",
          options: { choices },
        },
      },
    },
    hints: [
      { content: `Try adding each pair to see which one equals ${target}.` },
      { content: `The answer is $${correct[0]} + ${correct[1]} = ${target}$.` },
    ],
  };
}
