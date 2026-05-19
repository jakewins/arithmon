# Journal: STORY-0121 axolightl

## 2026-05-20 — Reviewer findings

Bounced back from `reviewing` to `next` with one open todo.

**Validated OK:**
- axolightl entry matches upstream (polliwog shape, water type,
  catchRate 100, 12 moves, evolution at level 32 → ampystoma).
- ampystoma entry mostly matches upstream (brute shape, dual type
  [lightning, water], 13 moves including energyBeam at L55).
- Both battle sprites byte-identical to upstream.
- All techniques already implemented from prior stories — no new tech
  defs needed.

**Defect (recurring pattern):**
- ampystoma `catchRate: 100` doesn't match upstream `catch_rate: 70`.
  Same mistake as STORY-0120 (aardart). Looks like the implementor is
  defaulting evolved forms to 100 instead of porting verbatim. See
  `todos/open/02-fix-ampystoma-catch-rate.md`.

Pre-commit gates and puppeteer evolution-QA deferred until the fix.
