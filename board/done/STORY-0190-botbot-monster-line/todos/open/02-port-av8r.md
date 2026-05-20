# Todo: Port av8r

Upstream: `upstream/mods/tuxemon/db/monster/av8r.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `flier`. Types: `metal/sky`. Terminal form (evolves from `botbot`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/av8r-sheet.png` → `public/assets/sprites/battle/av8r-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
