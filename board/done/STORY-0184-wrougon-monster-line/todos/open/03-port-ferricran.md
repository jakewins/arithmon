# Todo: Port ferricran

Upstream: `upstream/mods/tuxemon/db/monster/ferricran.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `dragon`. Types: `metal`. Terminal form (evolves from `allagon`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/ferricran-sheet.png` → `public/assets/sprites/battle/ferricran-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
