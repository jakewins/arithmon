# Todo: Port snarlon

Upstream: `upstream/mods/tuxemon/db/monster/snarlon.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `hunter`. Types: `shadow/normal`. Terminal — does not evolve.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/snarlon-sheet.png` → `public/assets/sprites/battle/snarlon-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
