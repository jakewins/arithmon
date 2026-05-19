# Todo: Port capiti

Upstream: `upstream/mods/tuxemon/db/monster/capiti.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `sprite`. Types: `normal`. Evolves to `capinyah` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/capiti-sheet.png` → `public/assets/sprites/battle/capiti-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
