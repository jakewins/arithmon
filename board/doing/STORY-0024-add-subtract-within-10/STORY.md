# STORY-0024: Add K.OA.A.2 — add and subtract within 10

## Description

Add a second skill node for K.OA.A.2 ("Add and subtract within 10") with
K.OA.A.5 as a prerequisite. This is the first test of the progression system
from STORY-0023 — the node should unlock once the player reaches box ≥ 2 on
K.OA.A.5.

Create `src/game/data/skills/k-oa-a2.ts` with a generator that produces
addition (sum ≤ 10) and subtraction (result ≥ 0) problems with operands 0–10.
Register it in the skill tree with the prerequisite edge.

## Acceptance Criteria

- [ ] `src/game/data/skills/k-oa-a2.ts` exists with `generate(): PerseusProblem`
- [ ] Registered in skill tree with K.OA.A.5 as prerequisite
- [ ] Node stays locked until K.OA.A.5 reaches box ≥ 2
- [ ] Problems use operands 0–10, both addition and subtraction
- [ ] Unit tests for generator bounds and prerequisite gating
