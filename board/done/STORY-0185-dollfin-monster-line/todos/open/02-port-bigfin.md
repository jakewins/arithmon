# Todo: Port bigfin

Upstream: `upstream/mods/tuxemon/db/monster/bigfin.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `leviathan`. Types: `water`. Terminal form (evolves from `dollfin;dollfin`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/bigfin-sheet.png` → `public/assets/sprites/battle/bigfin-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
