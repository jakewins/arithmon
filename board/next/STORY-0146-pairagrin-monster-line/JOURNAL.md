# Journal: STORY-0146 pairagrin

## 2026-05-20 — Reviewer findings

Bounced back from `reviewing` to `next` with one open todo.

**Validated OK:**
- pairagrin: flier, type ["sky"], catchRate 100, 9 moves, evolution
  at L26 → pairagrim.
- pairagrim: flier, type ["sky"], catchRate 70 (correct evolved-form),
  10 moves including the extra `tenThousandFeathers @ L55` move.
- Both sprites byte-identical to upstream.

**Defect:**
- pairagrim references `tenThousandFeathers` but no such technique
  definition exists in `src/game/data/techniques.ts`. This is a
  dangling slug — the gates pass typecheck because moveset entries
  are typed as `{ slug: string; learnedAt: number }` (no slug
  validation), but at runtime any use of the move would fail.
  See `todos/open/02-add-tenthousandfeathers-tech.md`.

This is a similar pattern to STORY-0137 (tigrock missing energyBeam)
except here the move slug IS listed but the corresponding tech def
is missing. Future reviews should also `grep` each new moveset slug
against techniques.ts.
