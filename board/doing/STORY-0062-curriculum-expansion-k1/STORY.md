# STORY-0062: Expand curriculum from K.OA to 1st-grade math (10 new skills)

## Description

The current skill tree covers 4 Kindergarten OA skills (K.OA.A.5, A.2, A.4, A.3).
Players who reach box 2+ on all of them have nothing new to learn. This story adds
two new widget types and 10 new CCSS-aligned skills spanning late-K through 1st grade,
roughly tripling the playable curriculum.

### New widget types

1. **Dual-input widget** — two numeric input boxes side by side (e.g. "_ tens _ ones").
   Needed for place-value problems (K.NBT.A.1, 1.NBT.B.2).

2. **Comparison selector widget** — pick >, =, or < between two values.
   Needed for 1.NBT.B.3.

### New skills (in implementation order)

```
Tier 1 (immediate unlocks from existing K.OA nodes):
  1. K.NBT.A.1  — compose/decompose 11-19 as 10 + ones    [prereqs: K.OA.A.3, K.OA.A.4]
  2. 1.OA.C.6   — add/subtract within 20                  [prereqs: K.OA.A.2]

Tier 2 (depends on tier 1):
  3. 1.OA.B.4   — subtraction as unknown-addend            [prereqs: 1.OA.C.6]
  4. 1.OA.D.7   — meaning of equals sign (true/false)      [prereqs: 1.OA.C.6]
  5. 1.OA.D.8   — find unknown in equation                 [prereqs: 1.OA.C.6]
  6. 1.NBT.B.2  — place value: tens and ones               [prereqs: K.NBT.A.1]

Tier 3 (depends on tier 2):
  7. 1.OA.A.1   — word problems within 20                  [prereqs: 1.OA.C.6, 1.OA.D.8]
  8. 1.NBT.B.3  — compare two-digit numbers (>, =, <)      [prereqs: 1.NBT.B.2]
  9. 1.NBT.C.5  — mentally find 10 more / 10 less          [prereqs: 1.NBT.B.2]
 10. 1.NBT.C.4  — add within 100                           [prereqs: 1.NBT.B.2, 1.OA.C.6]
```

Full DAG after this story:
```
K.OA.A.5 ──→ K.OA.A.2 ──→ K.OA.A.4 ──┐
                │           K.OA.A.3 ──┼──→ K.NBT.A.1 ──→ 1.NBT.B.2 ──→ 1.NBT.B.3
                │                      │                       │──→ 1.NBT.C.5
                │                      │                       │──→ 1.NBT.C.4
                └──→ 1.OA.C.6 ──→ 1.OA.B.4          ←────────┘
                         │──→ 1.OA.D.7
                         │──→ 1.OA.D.8 ──┐
                         └───────────────┼──→ 1.OA.A.1
```

### Implementation notes

- Each TODO is independently commitable. After completing each TODO, run
  `npm run format:check && npm run lint && npx tsc --noEmit && npm test`,
  fix any issues, and commit before moving on.
- The dual-input and comparison-selector widgets come first since later
  skills depend on them.
- A QA harness helper to jump straight into a specific math problem should
  be added alongside the dual-input widget, so all subsequent skills can
  be visually QA'd.

## Acceptance Criteria

- [ ] Dual-input widget type added to Perseus format, rendered in MathProblemScene
- [ ] Comparison selector widget type added, rendered in MathProblemScene
- [ ] All 10 skills have generators in `src/game/data/skills/`
- [ ] All 10 skills registered in `createSkillTree()` with correct prerequisites
- [ ] Unit tests for each generator
- [ ] Skill tree DAG has 14 nodes total
- [ ] QA screenshots confirm both new widget types render correctly
- [ ] All checks pass: format, lint, typecheck, tests
