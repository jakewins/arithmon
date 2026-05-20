# Todo: Port vivitrans

Upstream: `upstream/mods/tuxemon/db/monster/vivitrans.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `serpent`. Types: `frost`. Terminal form (evolves from `vivipere`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/vivitrans-sheet.png` → `public/assets/sprites/battle/vivitrans-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
