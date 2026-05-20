# Todo: Port viviphyta

Upstream: `upstream/mods/tuxemon/db/monster/viviphyta.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `serpent`. Types: `wood`. Terminal form (evolves from `vivipere`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/viviphyta-sheet.png` → `public/assets/sprites/battle/viviphyta-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
