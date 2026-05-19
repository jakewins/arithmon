# Todo: Port capinyah

Upstream: `upstream/mods/tuxemon/db/monster/capinyah.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `humanoid`. Types: `heroic`. Terminal form (evolves from `capiti`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/capinyah-sheet.png` → `public/assets/sprites/battle/capinyah-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
