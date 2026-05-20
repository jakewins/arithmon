# Todo: Port k9

Upstream: `upstream/mods/tuxemon/db/monster/k9.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `hunter`. Types: `metal/heroic`. Terminal form (evolves from `botbot`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/k9-sheet.png` → `public/assets/sprites/battle/k9-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
