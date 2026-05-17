# Skill: 1.NBT.C.4 — Add within 100

**CCSS 1.NBT.C.4**: Add within 100, including adding a two-digit number and a
one-digit number, and adding a two-digit number and a multiple of 10, using concrete
models or drawings and strategies based on place value, properties of operations,
and/or the relationship between addition and subtraction.

## Generator (`src/game/data/skills/1-nbt-c4.ts`)

Two sub-types:
- **Two-digit + one-digit**: e.g. 34 + 5 = 39 (keep sum ≤ 99)
- **Two-digit + multiple of 10**: e.g. 23 + 40 = 63 (keep sum ≤ 99)

70% numeric-input, 30% radio (distractors: ±1, ±10 from correct answer).

Phrasing: "What is 34 + 5?", "Solve: 23 + 40"

Hints:
- For two-digit + one-digit: "Add the ones first. Do you need to regroup?"
- For two-digit + tens: "Adding tens is like counting by tens."

## Registration

Add to `createSkillTree()` with prerequisites: `["1.NBT.B.2", "1.OA.C.6"]`.

## Tests

Unit tests: verify sums are correct, values in range. Run full check suite
and commit.
