# Dropdown variant for 1.OA.B.4 — subtraction as unknown-addend

**CCSS 1.OA.B.4**: Understand subtraction as an unknown-addend problem.

## Generator update (`src/game/data/skills/1-oa-b4.ts`)

Add a dropdown variant. When selected, produce problems like:

- "8 - 3 is the same as 3 + [[☃ answer]]" → dropdown widget,
  placeholder "___", choices: [5, 4, 6, 3], correct: "5"
- "12 - 7 is the same as 7 + [[☃ answer]]" → dropdown widget,
  choices: [5, 4, 6, 3], correct: "5"

This frames the subtraction-as-addition relationship as a natural sentence with
a blank to fill, reinforcing the conceptual connection between the operations.
Include 3-4 distractors (off-by-one errors, the subtrahend itself).

## Tests

Update unit tests to cover the new variant. Run full check suite and commit.
