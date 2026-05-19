# Todo: Port galnec

Upstream: `upstream/mods/tuxemon/db/monster/galnec.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `hunter`. Types: `earth`. Terminal — does not evolve.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/galnec-sheet.png` → `public/assets/sprites/battle/galnec-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
