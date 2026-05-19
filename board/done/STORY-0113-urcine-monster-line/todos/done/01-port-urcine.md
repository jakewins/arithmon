# Todo: Port urcine

Upstream: `upstream/mods/tuxemon/db/monster/urcine.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `brute`. Types: `shadow/heroic`. Terminal — does not evolve.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/urcine-sheet.png` → `public/assets/sprites/battle/urcine-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
