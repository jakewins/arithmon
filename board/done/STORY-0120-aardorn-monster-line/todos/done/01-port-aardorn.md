# Todo: Port aardorn

Upstream: `upstream/mods/tuxemon/db/monster/aardorn.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `varmint`. Types: `normal`. Evolves to `aardart` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/aardorn-sheet.png` → `public/assets/sprites/battle/aardorn-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
