# Todo: Port delfeco

Upstream: `upstream/mods/tuxemon/db/monster/delfeco.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `piscine`. Types: `water/wood`. Terminal form (evolves from `dollfin`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/delfeco-sheet.png` → `public/assets/sprites/battle/delfeco-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
