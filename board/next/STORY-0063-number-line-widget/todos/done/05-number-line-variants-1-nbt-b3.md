# Number-line variant for 1.NBT.B.3 — compare two-digit numbers

**CCSS 1.NBT.B.3**: Compare two two-digit numbers based on meanings of the
tens and ones digits, recording the results with >, =, and <.

## Generator update (`src/game/data/skills/1-nbt-b3.ts`)

Add a number-line variant. When selected, produce problems like:

- "Place **37** on the number line" → number-line widget, range [0, 100],
  step 1, labelStep 10, answer 37

This builds number-sense by making kids locate a number spatially. It
complements the existing comparison-selector variant — first build intuition
for where numbers live on the line, then compare them.

## Tests

Update unit tests to cover the new variant. Run full check suite and commit.
