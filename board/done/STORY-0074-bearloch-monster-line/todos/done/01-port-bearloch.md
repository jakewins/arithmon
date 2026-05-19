# Todo: Port bearloch

Upstream: `upstream/mods/tuxemon/db/monster/bearloch.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `brute`. Types: `metal/wood`. Terminal — does not evolve.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/bearloch-sheet.png` → `public/assets/sprites/battle/bearloch-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
