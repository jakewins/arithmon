# Todo: Port cochini

Upstream: `upstream/mods/tuxemon/db/monster/cochini.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `varmint`. Types: `normal`. Terminal — does not evolve.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/cochini-sheet.png` → `public/assets/sprites/battle/cochini-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
