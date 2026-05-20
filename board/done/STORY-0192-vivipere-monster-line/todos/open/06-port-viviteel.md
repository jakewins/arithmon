# Todo: Port viviteel

Upstream: `upstream/mods/tuxemon/db/monster/viviteel.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `serpent`. Types: `metal`. Terminal form (evolves from `vivipere`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/viviteel-sheet.png` → `public/assets/sprites/battle/viviteel-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
