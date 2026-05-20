# Todo: Port tikorch

Upstream: `upstream/mods/tuxemon/db/monster/tikorch.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `blob`. Types: `wood/fire`. Terminal form (evolves from `tikoal`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/tikorch-sheet.png` → `public/assets/sprites/battle/tikorch-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
