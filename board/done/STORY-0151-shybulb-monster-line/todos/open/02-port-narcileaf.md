# Todo: Port narcileaf

Upstream: `upstream/mods/tuxemon/db/monster/narcileaf.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `blob`. Types: `wood`. Terminal form (evolves from `shybulb`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/narcileaf-sheet.png` → `public/assets/sprites/battle/narcileaf-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
