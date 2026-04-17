# STORY-0022: Procedural question generation for K.OA.A.5

## Description

Replace the single hard-coded problem ("2 + 3") with a generator that
produces random addition and subtraction problems within 5.

Create `src/game/data/skills/k-oa-a5.ts` exporting a `generate()` function
that returns a `PerseusProblem` with randomised operands (sum ≤ 5 for
addition, non-negative result for subtraction). Wire
`SkillTree.getNextProblem()` to call the generator instead of returning
`PROBLEMS[0]`.

The generator should also randomise the question phrasing slightly (e.g.
"What is 2 + 3?", "Solve: 4 − 1", "2 + 1 = ?") and produce appropriate
hints per problem.

## Acceptance Criteria

- [ ] `src/game/data/skills/k-oa-a5.ts` exists with a `generate(): PerseusProblem` function
- [ ] Every call produces a valid problem with random operands (both addition and subtraction variants)
- [ ] `skilltree.getNextProblem()` calls the generator (no more hard-coded problem)
- [ ] Existing grading flow still works — MathProblemScene is unchanged
- [ ] Unit tests cover operand bounds (sum ≤ 5, result ≥ 0) and answer correctness
