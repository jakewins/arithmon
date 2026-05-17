# Skill: 1.OA.D.8 — Find the unknown in an equation

**CCSS 1.OA.D.8**: Determine the unknown whole number in an addition or subtraction
equation relating three whole numbers. For example, determine the unknown number
that makes the equation true in each of the equations: 8 + ? = 11, 5 = _ - 3,
6 + 6 = _.

## Generator (`src/game/data/skills/1-oa-d8.ts`)

Generate equations with a blank in different positions:
- `a + ? = c` (missing addend) — answer: c - a
- `? + b = c` (missing first addend) — answer: c - b
- `a - ? = c` (missing subtrahend) — answer: a - c
- `? - b = c` (missing minuend) — answer: b + c
- `a + b = ?` (missing sum) — answer: a + b
- `a - b = ?` (missing difference) — answer: a - b

All values within 0-20. Use `?` or `_` as the blank character.

70% numeric-input, 30% radio.

Hints: "Cover the ? and think about what number makes both sides equal."

## Registration

Add to `createSkillTree()` with prerequisites: `["1.OA.C.6"]`.

## Tests

Unit tests for each equation form. Run full check suite and commit.
