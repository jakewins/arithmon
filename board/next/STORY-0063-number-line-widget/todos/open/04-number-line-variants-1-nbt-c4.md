# Number-line variant for 1.NBT.C.4 — add within 100

**CCSS 1.NBT.C.4**: Add within 100, including adding a two-digit number and a
one-digit number, and adding a two-digit number and a multiple of 10.

## Generator update (`src/game/data/skills/1-nbt-c4.ts`)

Add a number-line variant. When selected, produce problems like:

- "Show **34 + 20** on the number line" → number-line widget, range [0, 100],
  step 10, labelStep 10, answer 54
- "Show **52 + 30** on the number line" → number-line widget, range [0, 100],
  step 10, labelStep 10, answer 82

Focus on the "adding a multiple of 10" sub-type for number-line problems since
the step-10 line maps naturally. The single-digit addition variant is less
suited to a step-10 number line.

## Tests

Update unit tests to cover the new variant. Run full check suite and commit.
