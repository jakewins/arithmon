# Todo: Port aardart

Upstream: `upstream/mods/tuxemon/db/monster/aardart.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `varmint`. Types: `normal`. Terminal form (evolves from `aardorn`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/aardart-sheet.png` → `public/assets/sprites/battle/aardart-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
