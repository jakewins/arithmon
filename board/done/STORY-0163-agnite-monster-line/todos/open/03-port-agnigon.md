# Todo: Port agnigon

Upstream: `upstream/mods/tuxemon/db/monster/agnigon.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `dragon`. Types: `fire/shadow`. Terminal form (evolves from `agnidon`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/agnigon-sheet.png` → `public/assets/sprites/battle/agnigon-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
