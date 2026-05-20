# Todo: Port gryfix

Upstream: `upstream/mods/tuxemon/db/monster/gryfix.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `flier`. Types: `sky`. Terminal form (evolves from `corvix`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/gryfix-sheet.png` → `public/assets/sprites/battle/gryfix-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
