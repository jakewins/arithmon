# Todo: Port moloch

Upstream: `upstream/mods/tuxemon/db/monster/moloch.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `brute`. Types: `wood/heroic`. Terminal form (evolves from `legko`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/moloch-sheet.png` → `public/assets/sprites/battle/moloch-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
