# Todo: Port spycozeus

Upstream: `upstream/mods/tuxemon/db/monster/spycozeus.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `varmint`. Types: `wood`. Terminal — does not evolve.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/spycozeus-sheet.png` → `public/assets/sprites/battle/spycozeus-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
