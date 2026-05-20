# Todo: Port allagon

Upstream: `upstream/mods/tuxemon/db/monster/allagon.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `dragon`. Types: `metal`. Evolves to `ferricran` at `level 32`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/allagon-sheet.png` → `public/assets/sprites/battle/allagon-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
