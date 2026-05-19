# Todo: Port cateye

Upstream: `upstream/mods/tuxemon/db/monster/cateye.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `hunter`. Types: `cosmic`. Terminal — does not evolve.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/cateye-sheet.png` → `public/assets/sprites/battle/cateye-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
