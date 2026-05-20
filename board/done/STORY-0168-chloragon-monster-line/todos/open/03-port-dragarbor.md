# Todo: Port dragarbor

Upstream: `upstream/mods/tuxemon/db/monster/dragarbor.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `dragon`. Types: `wood/cosmic`. Terminal form (evolves from `sapragon`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/dragarbor-sheet.png` → `public/assets/sprites/battle/dragarbor-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
