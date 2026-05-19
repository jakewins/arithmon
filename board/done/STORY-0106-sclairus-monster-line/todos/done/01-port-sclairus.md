# Todo: Port sclairus

Upstream: `upstream/mods/tuxemon/db/monster/sclairus.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `blob`. Types: `wood`. Terminal — does not evolve.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/sclairus-sheet.png` → `public/assets/sprites/battle/sclairus-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
