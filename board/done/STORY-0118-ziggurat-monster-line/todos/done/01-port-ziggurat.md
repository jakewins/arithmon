# Todo: Port ziggurat

Upstream: `upstream/mods/tuxemon/db/monster/ziggurat.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `varmint`. Types: `earth/normal`. Terminal — does not evolve.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/ziggurat-sheet.png` → `public/assets/sprites/battle/ziggurat-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
