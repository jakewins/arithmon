import type { RadioWidget, RadioChoice } from "./problems";

/** Fisher-Yates shuffle (in-place). */
export function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Build a RadioWidget with the correct answer and 3 nearby-integer distractors.
 * Distractors are clamped to [min, max] and deduplicated.
 */
export function makeRadioWidget(answer: number, min: number, max: number): RadioWidget {
  const distractors = new Set<number>();
  // Try offsets ±1, ±2 first, then widen if needed
  for (const offset of [1, -1, 2, -2, 3, -3]) {
    const d = answer + offset;
    if (d >= min && d <= max && d !== answer) {
      distractors.add(d);
    }
    if (distractors.size >= 3) break;
  }

  const choices: RadioChoice[] = [
    { content: String(answer), correct: true },
    ...[...distractors].map((d) => ({ content: String(d), correct: false })),
  ];

  return {
    type: "radio",
    options: { choices: shuffle(choices) },
  };
}
