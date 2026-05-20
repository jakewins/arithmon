# Todo: Port miaownolith

Upstream: `upstream/mods/tuxemon/db/monster/miaownolith.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `hunter`. Types: `earth/normal`. Terminal form (evolves from `memnomnom;memnomnom`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/miaownolith-sheet.png` → `public/assets/sprites/battle/miaownolith-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
