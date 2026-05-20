# Todo: Port wrougon

Upstream: `upstream/mods/tuxemon/db/monster/wrougon.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `dragon`. Types: `metal`. Evolves to `allagon` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/wrougon-sheet.png` → `public/assets/sprites/battle/wrougon-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
