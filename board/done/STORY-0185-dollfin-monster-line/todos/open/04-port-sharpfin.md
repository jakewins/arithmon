# Todo: Port sharpfin

Upstream: `upstream/mods/tuxemon/db/monster/sharpfin.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `piscine`. Types: `water/heroic`. Terminal form (evolves from `dollfin;dollfin`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/sharpfin-sheet.png` → `public/assets/sprites/battle/sharpfin-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
