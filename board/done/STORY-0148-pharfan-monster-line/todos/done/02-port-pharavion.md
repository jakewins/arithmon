# Todo: Port pharavion

Upstream: `upstream/mods/tuxemon/db/monster/pharavion.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `landrace`. Types: `water/heroic`. Terminal form (evolves from `pharfan`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/pharavion-sheet.png` → `public/assets/sprites/battle/pharavion-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
