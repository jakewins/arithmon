# Todo: Port tikoal

Upstream: `upstream/mods/tuxemon/db/monster/tikoal.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `blob`. Types: `wood/fire`. Evolves to `tikorch` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/tikoal-sheet.png` → `public/assets/sprites/battle/tikoal-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
