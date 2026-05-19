# Todo: Port graffiki

Upstream: `upstream/mods/tuxemon/db/monster/graffiki.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `humanoid`. Types: `normal`. Terminal — does not evolve.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/graffiki-sheet.png` → `public/assets/sprites/battle/graffiki-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
