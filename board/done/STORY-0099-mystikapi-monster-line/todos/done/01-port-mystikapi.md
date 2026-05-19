# Todo: Port mystikapi

Upstream: `upstream/mods/tuxemon/db/monster/mystikapi.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `landrace`. Types: `cosmic`. Terminal — does not evolve.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/mystikapi-sheet.png` → `public/assets/sprites/battle/mystikapi-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
