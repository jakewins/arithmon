# Todo: Port xeon_2

Upstream: `upstream/mods/tuxemon/db/monster/xeon_2.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `humanoid`. Types: `metal`. Terminal — does not evolve.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/xeon_2-sheet.png` → `public/assets/sprites/battle/xeon_2-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
