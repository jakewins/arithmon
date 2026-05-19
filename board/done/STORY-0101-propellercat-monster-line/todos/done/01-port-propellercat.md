# Todo: Port propellercat

Upstream: `upstream/mods/tuxemon/db/monster/propellercat.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `flier`. Types: `normal/sky`. Terminal — does not evolve.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/propellercat-sheet.png` → `public/assets/sprites/battle/propellercat-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
