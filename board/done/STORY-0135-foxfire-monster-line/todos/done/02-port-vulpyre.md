# Todo: Port vulpyre

Upstream: `upstream/mods/tuxemon/db/monster/vulpyre.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `hunter`. Types: `fire`. Terminal form (evolves from `foxfire`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/vulpyre-sheet.png` → `public/assets/sprites/battle/vulpyre-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
