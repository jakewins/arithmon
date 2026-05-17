# Skill: K.NBT.A.1 — Compose/decompose 11-19

**CCSS K.NBT.A.1**: Compose and decompose numbers from 11 to 19 into ten ones and
some further ones. Understand that these numbers are composed of ten ones and one,
two, three, four, five, six, seven, eight, or nine ones.

## Generator (`src/game/data/skills/k-nbt-a1.ts`)

Problem variants:
- "14 = 10 + ?" → numeric-input (answer: 4)
- "10 + 7 = ?" → numeric-input (answer: 17)
- "How many tens and ones in 16?" → dual-input (answer: 1 ten, 6 ones)
- Radio variant: "Which shows 13?" with choices like "10+3", "10+4", "10+2"

Target numbers: random from 11-19.

Hints: "Think of it as one group of ten plus some extra ones."

## Registration

Add to `createSkillTree()` with prerequisites: `["K.OA.A.3", "K.OA.A.4"]`.
Update the `SkillNodeId` type.

## Tests

Unit tests for the generator: check problem format, answer correctness,
range of target numbers. Run full check suite and commit.
