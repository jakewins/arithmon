# Todo: Port knindling

Upstream: `upstream/mods/tuxemon/db/monster/knindling.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `hunter`. Types: `fire`. Terminal form (evolves from `flounce`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/knindling-sheet.png` → `public/assets/sprites/battle/knindling-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
