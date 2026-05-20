# Todo: Port flounce

Upstream: `upstream/mods/tuxemon/db/monster/flounce.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `hunter`. Types: `fire`. Evolves to `knindling` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/flounce-sheet.png` → `public/assets/sprites/battle/flounce-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
