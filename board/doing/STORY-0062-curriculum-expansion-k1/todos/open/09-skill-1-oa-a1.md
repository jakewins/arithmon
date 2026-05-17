# Skill: 1.OA.A.1 — Word problems within 20

**CCSS 1.OA.A.1**: Use addition and subtraction within 20 to solve word problems
involving situations of adding to, taking from, putting together, taking apart, and
comparing, with unknowns in all positions.

## Generator (`src/game/data/skills/1-oa-a1.ts`)

Generate short word problems from templates. Question types:
- **Add to**: "Sam has 7 apples. He picks 5 more. How many apples now?"
- **Take from**: "There are 14 birds. 6 fly away. How many are left?"
- **Put together**: "There are 8 red balls and 4 blue balls. How many balls?"
- **Compare**: "Ana has 12 stickers. Ben has 7. How many more does Ana have?"

Use randomized names, objects, and numbers (sum/minuend ≤ 20).

Note: word problems produce longer question text. Verify that MathProblemScene
wraps text properly — if not, reduce font size or add scroll for this content.

70% numeric-input, 30% radio.

Hints: scenario-specific (e.g. "You need to subtract to find how many are left.")

## Registration

Add to `createSkillTree()` with prerequisites: `["1.OA.C.6", "1.OA.D.8"]`.

## Tests

Unit tests: verify answer matches the word problem arithmetic, check that
question text includes the numbers. Run full check suite and commit.
