# Todo: Port sampsack

Upstream: `upstream/mods/tuxemon/db/monster/sampsack.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `brute`. Types: `heroic`. Terminal — does not evolve.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/sampsack-sheet.png` → `public/assets/sprites/battle/sampsack-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
