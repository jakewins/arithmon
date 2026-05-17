# Skill: 1.OA.B.4 — Subtraction as unknown-addend

**CCSS 1.OA.B.4**: Understand subtraction as an unknown-addend problem. For example,
subtract 10 - 8 by finding the number that makes 10 when added to 8.

## Generator (`src/game/data/skills/1-oa-b4.ts`)

Similar to K.OA.A.4 (make 10) but generalized to any minuend ≤ 20:
- Given minuend (5-20) and subtrahend (1 to minuend-1)
- Phrasing: "10 - 8 = ? Think: 8 + ? = 10" or "What number added to 6 makes 15?"
- 70% numeric-input, 30% radio

The key pedagogical difference from K.OA.A.4 is framing subtraction *as* addition
with a missing addend, not just "find what makes 10".

Hints: "Think: what do I add to [subtrahend] to get [minuend]?"

## Registration

Add to `createSkillTree()` with prerequisites: `["1.OA.C.6"]`.

## Tests

Unit tests for the generator. Run full check suite and commit.
