# STORY-0026: Add K.OA.A.4 (make 10) and K.OA.A.3 (decompose ≤ 10)

## Description

Add two more skill nodes to round out the Kindergarten Operations & Algebraic
Thinking strand:

**K.OA.A.4 — Find the number that makes 10**
- Generator produces "? + 6 = 10" / "10 = 3 + ?" style problems
- Prerequisite: K.OA.A.2 (within 10)

**K.OA.A.3 — Decompose numbers ≤ 10 into pairs**
- Generator produces "Show a way to make 7: _ + _ = 7" or
  multiple-choice "Which pair makes 9? [4+5] [3+5] [2+6]"
- Prerequisite: K.OA.A.2 (within 10)
- Note: the "two blanks" variant may need a new widget or creative use
  of multiple-choice for now. Acceptable to start with multiple-choice only
  and add a dual-input widget later.

These two nodes are independent of each other but both depend on K.OA.A.2,
so they demonstrate the DAG forking in the progression system.

After this story the full K.OA strand is playable:
```
K.OA.A.5 (within 5)
  └→ K.OA.A.2 (within 10)
       ├→ K.OA.A.4 (make 10)
       └→ K.OA.A.3 (decompose ≤ 10)
```

## Acceptance Criteria

- [ ] `src/game/data/skills/k-oa-a4.ts` — make-10 generator
- [ ] `src/game/data/skills/k-oa-a3.ts` — decompose generator (multiple-choice for now)
- [ ] Both registered with K.OA.A.2 as prerequisite
- [ ] Both stay locked until K.OA.A.2 box ≥ 2
- [ ] Skill tree now has 4 nodes forming a proper DAG
- [ ] Unit tests for each generator
