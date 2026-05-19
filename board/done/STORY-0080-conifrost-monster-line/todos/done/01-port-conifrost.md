# Todo: Port conifrost

Upstream: `upstream/mods/tuxemon/db/monster/conifrost.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `blob`. Types: `wood/frost`. Terminal — does not evolve.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/conifrost-sheet.png` → `public/assets/sprites/battle/conifrost-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
