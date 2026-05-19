# Journal: STORY-0076 brewdin

## 2026-05-19 — Reviewer findings

Bounced back from `reviewing` to `next` with one open todo.

**Validated OK:**
- Sprite asset is byte-identical to upstream.
- Moveset levels and slugs match upstream (13 level-up techniques,
  struggle fallback correctly skipped).
- `baseStats: stats("varmint")` matches upstream `shape: varmint`.
- `catchRate: 100` matches upstream `catch_rate: 100.0`.
- `evolutions: []` correct (standalone).

**Defect:**
- `types: ["water"]` drops the secondary `shadow` type from upstream's
  `types: [water, shadow]`. See
  `todos/open/02-fix-missing-shadow-type.md`.

This is the **second** dual-type oversight in two consecutive stories
(STORY-0075 boxali also dropped its `sky` secondary). The implementor
should double-check the FULL `types:` list, not just the primary, when
porting future monsters.

Not run: pre-commit gates and puppeteer art QA (deferred until the
type fix lands).
