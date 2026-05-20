# Todo: Port picc

Upstream: `upstream/mods/tuxemon/db/monster/picc.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `piscine`. Types: `metal/water`. Terminal form (evolves from `botbot`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/picc-sheet.png` → `public/assets/sprites/battle/picc-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
