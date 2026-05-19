# Todo: Port anu

Upstream: `upstream/mods/tuxemon/db/monster/anu.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `varmint`. Types: `cosmic`. Terminal — does not evolve.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/anu-sheet.png` → `public/assets/sprites/battle/anu-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
