# Todo: Port eaglace

Upstream: `upstream/mods/tuxemon/db/monster/eaglace.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `flier`. Types: `frost/sky`. Terminal form (evolves from `heronquak`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/eaglace-sheet.png` → `public/assets/sprites/battle/eaglace-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
