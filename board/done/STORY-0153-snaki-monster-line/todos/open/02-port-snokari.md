# Todo: Port snokari

Upstream: `upstream/mods/tuxemon/db/monster/snokari.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `serpent`. Types: `normal`. Terminal form (evolves from `snaki`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/snokari-sheet.png` → `public/assets/sprites/battle/snokari-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
