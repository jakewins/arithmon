# Todo: Port pyraminx

Upstream: `upstream/mods/tuxemon/db/monster/pyraminx.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `hunter`. Types: `cosmic/normal`. Terminal form (evolves from `memnomnom;memnomnom`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/pyraminx-sheet.png` → `public/assets/sprites/battle/pyraminx-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
