# Todo: Port cowpignon

Upstream: `upstream/mods/tuxemon/db/monster/cowpignon.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `sprite`. Types: `wood/cosmic`. Terminal — does not evolve.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/cowpignon-sheet.png` → `public/assets/sprites/battle/cowpignon-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
