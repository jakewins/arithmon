# Todo: Port hatchling

Upstream: `upstream/mods/tuxemon/db/monster/hatchling.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `flier`. Types: `sky`. Evolves to `birdling` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/hatchling-sheet.png` → `public/assets/sprites/battle/hatchling-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
