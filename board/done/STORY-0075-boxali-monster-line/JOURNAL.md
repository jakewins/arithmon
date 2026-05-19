# Journal: STORY-0075 boxali

## 2026-05-19 — Reviewer findings

Bounced back from `reviewing` to `next` with one open todo.

**Validated OK:**
- Sprite asset is byte-identical to upstream.
- Moveset levels and slugs match upstream (12 level-up techniques,
  struggle fallback correctly skipped).
- `baseStats: stats("brute")` matches upstream `shape: brute`.
- `catchRate: 100` matches upstream `catch_rate: 100.0`.
- `evolutions: []` correct (standalone).

**Defect:**
- `types: ["heroic"]` drops the secondary `sky` type from upstream's
  `types: [heroic, sky]`. See `todos/open/02-fix-missing-sky-type.md`.

Not run: pre-commit gates and puppeteer art QA (deferred until the
type fix lands — those checks should run again after the change).
