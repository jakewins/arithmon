# Todo: Port abesnaki

Upstream: `upstream/mods/tuxemon/db/monster/abesnaki.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `serpent`. Types: `cosmic`. Terminal — does not evolve.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/abesnaki-sheet.png` → `public/assets/sprites/battle/abesnaki-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
