# Todo: Port enduros

Upstream: `upstream/mods/tuxemon/db/monster/enduros.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `brute`. Types: `heroic`. Terminal — does not evolve.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/enduros-sheet.png` → `public/assets/sprites/battle/enduros-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
