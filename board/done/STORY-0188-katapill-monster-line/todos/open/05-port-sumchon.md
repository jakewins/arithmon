# Todo: Port sumchon

Upstream: `upstream/mods/tuxemon/db/monster/sumchon.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `brute`. Types: `metal/heroic`. Terminal form (evolves from `katacoon`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/sumchon-sheet.png` → `public/assets/sprites/battle/sumchon-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
