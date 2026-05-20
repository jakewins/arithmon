# Todo: Port qetzlrokilus

Upstream: `upstream/mods/tuxemon/db/monster/qetzlrokilus.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `flier`. Types: `earth/fire`. Terminal form (evolves from `metesaur`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/qetzlrokilus-sheet.png` → `public/assets/sprites/battle/qetzlrokilus-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
