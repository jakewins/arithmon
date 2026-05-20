# Todo: Port ruption

Upstream: `upstream/mods/tuxemon/db/monster/ruption.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `brute`. Types: `fire`. Terminal form (evolves from `embra`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/ruption-sheet.png` → `public/assets/sprites/battle/ruption-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
