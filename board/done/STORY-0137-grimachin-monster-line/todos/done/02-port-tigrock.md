# Todo: Port tigrock

Upstream: `upstream/mods/tuxemon/db/monster/tigrock.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `hunter`. Types: `metal`. Terminal form (evolves from `grimachin`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/tigrock-sheet.png` → `public/assets/sprites/battle/tigrock-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
