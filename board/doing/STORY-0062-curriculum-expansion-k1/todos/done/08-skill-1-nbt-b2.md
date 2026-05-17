# Skill: 1.NBT.B.2 — Place value (tens and ones)

**CCSS 1.NBT.B.2**: Understand that the two digits of a two-digit number represent
amounts of tens and ones. Understand the following as special cases:
- 10 can be thought of as a bundle of ten ones — called a "ten"
- The numbers 10-19 are composed of a ten and one, two, ..., nine ones
- The numbers 20, 30, ..., 90 refer to one, two, ..., nine tens (and 0 ones)

## Generator (`src/game/data/skills/1-nbt-b2.ts`)

Problem variants:
- "How many tens and ones in 47?" → **dual-input** (answer: 4 tens, 7 ones)
- "What number has 3 tens and 5 ones?" → numeric-input (answer: 35)
- Radio: "Which shows 62?" with choices "6 tens 2 ones", "2 tens 6 ones", etc.

Target numbers: random from 10-99.

Hints: "The first digit tells you how many tens. The second digit tells you
how many ones."

## Registration

Add to `createSkillTree()` with prerequisites: `["K.NBT.A.1"]`.

## Tests

Unit tests for each variant. Run full check suite and commit.
