# Todo: Port jemuar

Upstream: `upstream/mods/tuxemon/db/monster/jemuar.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `hunter`. Types: `earth/cosmic`. Terminal form (evolves from `rockat`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/jemuar-sheet.png` → `public/assets/sprites/battle/jemuar-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
