# Number-line variant for 1.NBT.C.5 — 10 more / 10 less

**CCSS 1.NBT.C.5**: Given a two-digit number, mentally find 10 more or 10 less
than the number, without having to count.

## Generator update (`src/game/data/skills/1-nbt-c5.ts`)

Add a number-line variant. When selected, produce problems like:

- "Start at **47**. Find **10 more**." → number-line widget, range [0, 100],
  step 10, labelStep 10, answer 57
- "Start at **63**. Find **10 less**." → number-line widget, range [0, 100],
  step 10, labelStep 10, answer 53

The number line with step 10 makes the +10/-10 jump pattern visually obvious.

## Tests

Update unit tests to cover the new variant. Run full check suite and commit.
