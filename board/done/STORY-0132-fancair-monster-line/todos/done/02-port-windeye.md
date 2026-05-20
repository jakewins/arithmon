# Todo: Port windeye

Upstream: `upstream/mods/tuxemon/db/monster/windeye.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `humanoid`. Types: `lightning/metal`. Terminal form (evolves from `fancair`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/windeye-sheet.png` → `public/assets/sprites/battle/windeye-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
