# Todo: Port eruptibus

Upstream: `upstream/mods/tuxemon/db/monster/eruptibus.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `landrace`. Types: `earth/fire`. Terminal form (evolves from `ignibus;ignibus`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/eruptibus-sheet.png` → `public/assets/sprites/battle/eruptibus-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
