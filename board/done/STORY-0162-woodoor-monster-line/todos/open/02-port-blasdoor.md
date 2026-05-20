# Todo: Port blasdoor

Upstream: `upstream/mods/tuxemon/db/monster/blasdoor.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `sprite`. Types: `metal`. Terminal form (evolves from `woodoor`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/blasdoor-sheet.png` → `public/assets/sprites/battle/blasdoor-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
