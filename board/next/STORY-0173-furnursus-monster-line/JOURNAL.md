# STORY-0173 Furnursus line — Review notes

## 2026-05-20 — Bounced from reviewing → next

Reviewer found one defect; otherwise the port is clean.

### Defects
- **statursus**: `types: ["fire"]` in `src/game/data/monsters.ts`, but
  upstream YAML is `[fire, cosmic]`. Dropped secondary type — see
  `todos/open/04-fix-statursus-dual-type.md`.

### Verified clean
- furnursus: humanoid, type [fire], catchRate 100, 8 moves, evol L18.
- coaldiak: humanoid, type [fire, normal], catchRate 35, 8 moves.
- Per-form move difference (furnursus L31 = tinder; statursus/coaldiak
  L31 = electricalStorm) is correctly captured.
- All three sprites byte-identical to upstream.
- All 9 distinct techniques exist in `techniques.ts` (rock, fireBall,
  fireClaw, oneTwo, flamethrower, giveAll, supernova, tinder,
  electricalStorm).

Once the dual-type fix lands, this is ready for re-review.
