# Todo: Port b_ver_1

Upstream: `upstream/mods/tuxemon/db/monster/b_ver_1.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `varmint`. Types: `metal/wood`. Terminal form (evolves from `botbot`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/b_ver_1-sheet.png` → `public/assets/sprites/battle/b_ver_1-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
