# Todo: Port wolffsky

Upstream: `upstream/mods/tuxemon/db/monster/wolffsky.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `hunter`. Types: `wood/frost`. Terminal — does not evolve.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/wolffsky-sheet.png` → `public/assets/sprites/battle/wolffsky-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
