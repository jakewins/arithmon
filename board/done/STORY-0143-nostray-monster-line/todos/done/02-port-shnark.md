# Todo: Port shnark

Upstream: `upstream/mods/tuxemon/db/monster/shnark.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `piscine`. Types: `water`. Terminal form (evolves from `nostray`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/shnark-sheet.png` → `public/assets/sprites/battle/shnark-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
