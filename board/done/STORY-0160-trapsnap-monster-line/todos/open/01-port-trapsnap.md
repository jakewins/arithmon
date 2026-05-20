# Todo: Port trapsnap

Upstream: `upstream/mods/tuxemon/db/monster/trapsnap.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `brute`. Types: `wood/shadow`. Evolves to `sapsnap` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/trapsnap-sheet.png` → `public/assets/sprites/battle/trapsnap-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
