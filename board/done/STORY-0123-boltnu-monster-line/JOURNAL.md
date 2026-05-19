# Journal: STORY-0123 boltnu

## 2026-05-20 — Reviewer findings

Bounced back from `reviewing` to `next` with one open todo.

**Validated OK:**
- boltnu entry: blob shape, metal type, catchRate 100, evolution at
  L18 → exclawvate, 8 level-up moves — matches upstream.
- exclawvate entry: dragon shape, metal type, **catchRate 70**
  (correctly different from boltnu's 100), +energyBeam at L55,
  9 level-up moves — matches upstream. Implementor got the
  evolved-form catchRate right this time.
- exclawvate sprite is byte-identical to upstream.
- All techniques already implemented from prior stories.

**Defect:**
- `public/assets/sprites/battle/boltnu-sheet.png` is a 298-byte
  placeholder (pre-existing from earlier work) — pixel data differs
  from upstream's 2580-byte real sprite. The implementor needed to
  overwrite it. See `todos/open/02-fix-boltnu-sprite.md`.

Pre-commit gates and puppeteer QA deferred until the sprite fix lands.
