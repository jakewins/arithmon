# Todo: Port bamboon

Upstream: `upstream/mods/tuxemon/db/monster/bamboon.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `sprite`. Types: `wood/heroic`. Terminal form (evolves from `budaye;budaye`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/bamboon-sheet.png` → `public/assets/sprites/battle/bamboon-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
