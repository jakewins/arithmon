# Number-line variant for 1.OA.C.6 — add/subtract within 20

**CCSS 1.OA.C.6**: Add and subtract within 20.

## Generator update (`src/game/data/skills/1-oa-c6.ts`)

Add a number-line variant to the existing generator. When this variant is
selected, produce problems like:

- "Show **8 + 5** on the number line" → number-line widget, range [0, 20],
  step 1, labelStep 5, answer 13
- "Show **14 - 6** on the number line" → number-line widget, range [0, 20],
  step 1, labelStep 5, answer 8

This makes the "hop" strategy visible — kids see the distance on the line.

## Tests

Update unit tests to cover the new variant: check that the problem uses the
`number-line` widget type, range is [0, 20], answer is correct.

Run full check suite and commit.
