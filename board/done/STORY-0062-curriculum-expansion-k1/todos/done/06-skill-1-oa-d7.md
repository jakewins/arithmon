# Skill: 1.OA.D.7 — Meaning of the equals sign

**CCSS 1.OA.D.7**: Understand the meaning of the equal sign, and determine if
equations involving addition and subtraction are true or false. For example, which
of the following equations are true and which are false? 6 = 6, 7 = 8 - 1,
5 + 2 = 2 + 5, 4 + 1 = 5 + 2.

## Generator (`src/game/data/skills/1-oa-d7.ts`)

Generate an equation and ask "True or false?":
- True equations: `a + b = c + d` where both sides equal (e.g. 3+4 = 5+2),
  or `a = a`, or `a + b = b + a`, or `a = b + c` where a = b + c
- False equations: same forms but with one side off by 1-2

Always use radio widget with exactly 2 choices: "True" and "False".

Mix of equation forms to keep it varied. ~50% true, ~50% false.

Hints: "Work out each side separately. Do they give the same number?"

## Registration

Add to `createSkillTree()` with prerequisites: `["1.OA.C.6"]`.

## Tests

Unit tests: verify true equations actually balance, false ones don't.
Run full check suite and commit.
