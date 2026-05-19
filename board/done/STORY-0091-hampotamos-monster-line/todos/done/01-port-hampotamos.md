# Todo: Port hampotamos

Upstream: `upstream/mods/tuxemon/db/monster/hampotamos.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `landrace`. Types: `earth`. Terminal — does not evolve.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/hampotamos-sheet.png` → `public/assets/sprites/battle/hampotamos-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
