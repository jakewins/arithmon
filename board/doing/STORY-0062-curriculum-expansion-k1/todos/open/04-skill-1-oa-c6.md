# Skill: 1.OA.C.6 — Add and subtract within 20

**CCSS 1.OA.C.6**: Add and subtract within 20, demonstrating fluency for addition
and subtraction within 10. Use strategies such as counting on, making ten,
decomposing a number leading to a ten, using the relationship between addition and
subtraction, and creating equivalent but easier or known sums.

## Generator (`src/game/data/skills/1-oa-c6.ts`)

Same pattern as K.OA.A.2 but with operand range expanded to 0-20:
- Addition: a + b where a,b in 1-19 and sum ≤ 20
- Subtraction: a - b where a in 2-20, b in 1-a (result ≥ 0)
- 70% numeric-input, 30% radio (distractors in range 0-20)

Phrasing variants: "What is a + b?", "Solve: a - b", "a + b = ?"

Hints: "Try making a ten first" / "Count on from the bigger number"

## Registration

Add to `createSkillTree()` with prerequisites: `["K.OA.A.2"]`.
Update the `SkillNodeId` type.

## Tests

Unit tests for the generator. Run full check suite and commit.
