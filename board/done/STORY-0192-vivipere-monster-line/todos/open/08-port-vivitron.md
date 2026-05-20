# Todo: Port vivitron

Upstream: `upstream/mods/tuxemon/db/monster/vivitron.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `serpent`. Types: `lightning`. Terminal form (evolves from `vivipere`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/vivitron-sheet.png` → `public/assets/sprites/battle/vivitron-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
