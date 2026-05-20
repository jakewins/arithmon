# Todo: Port runesquito

Upstream: `upstream/mods/tuxemon/db/monster/runesquito.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `flier`. Types: `earth/shadow`. Terminal form (evolves from `cocrune`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/runesquito-sheet.png` → `public/assets/sprites/battle/runesquito-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
