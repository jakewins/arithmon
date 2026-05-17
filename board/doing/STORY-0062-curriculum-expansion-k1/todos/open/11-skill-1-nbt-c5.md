# Skill: 1.NBT.C.5 — Mentally find 10 more or 10 less

**CCSS 1.NBT.C.5**: Given a two-digit number, mentally find 10 more or 10 less than
the number, without having to count; explain the reasoning used.

## Generator (`src/game/data/skills/1-nbt-c5.ts`)

Problem variants:
- "What is 10 more than 34?" → numeric-input (answer: 44)
- "What is 10 less than 56?" → numeric-input (answer: 46)
- Radio variant with nearby distractors (±1, ±10, ±11)

Base numbers: 10-89 for "10 more", 20-99 for "10 less" (keep results in 0-99).

50% "10 more", 50% "10 less".

Hints: "When you add 10, only the tens digit changes. The ones digit stays the same."

## Registration

Add to `createSkillTree()` with prerequisites: `["1.NBT.B.2"]`.

## Tests

Unit tests for the generator. Run full check suite and commit.
