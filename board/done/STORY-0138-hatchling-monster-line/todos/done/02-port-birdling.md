# Todo: Port birdling

Upstream: `upstream/mods/tuxemon/db/monster/birdling.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `flier`. Types: `sky`. Terminal form (evolves from `hatchling`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/birdling-sheet.png` → `public/assets/sprites/battle/birdling-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
