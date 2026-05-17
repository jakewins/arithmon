# Skill: 1.NBT.B.3 — Compare two-digit numbers

**CCSS 1.NBT.B.3**: Compare two two-digit numbers based on meanings of the tens and
ones digits, recording the results of comparisons with the symbols >, =, and <.

## Generator (`src/game/data/skills/1-nbt-b3.ts`)

Generate two two-digit numbers (10-99) and ask which comparison is correct:
- ~40% cases where tens differ (e.g. 34 vs 52)
- ~40% cases where tens are same, ones differ (e.g. 45 vs 48)
- ~20% equal numbers (e.g. 37 vs 37)

Uses the **comparison widget** from TODO 02.

Phrasing: "Compare: 45 ○ 54" or "Which symbol goes between 23 and 31?"

Hints: "First compare the tens. If the tens are the same, compare the ones."

## Registration

Add to `createSkillTree()` with prerequisites: `["1.NBT.B.2"]`.

## Tests

Unit tests: verify the answer matches the actual numeric comparison.
Run full check suite and commit.
