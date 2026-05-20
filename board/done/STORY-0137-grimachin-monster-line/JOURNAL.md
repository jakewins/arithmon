# Journal: STORY-0137 grimachin

## 2026-05-20 — Reviewer findings

Bounced back from `reviewing` to `next` with one open todo.

**Validated OK:**
- grimachin: hunter, type ["metal"], catchRate 100, 9 moves,
  evolution at L32 → tigrock.
- tigrock: hunter, type ["metal"], catchRate 70 (correct
  evolved-form value).
- Both sprites byte-identical to upstream.

**Defect:**
- tigrock has 9 level-up moves but upstream has 10 — implementor
  forgot to add `energyBeam @ L55`, the late-game move that the
  basic form (grimachin) doesn't have. See
  `todos/open/02-add-tigrock-energybeam.md`.

Pre-commit gates and puppeteer QA deferred until the moveset fix
lands.
