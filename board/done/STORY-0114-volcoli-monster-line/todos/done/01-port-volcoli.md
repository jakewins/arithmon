# Todo: Port volcoli

Upstream: `upstream/mods/tuxemon/db/monster/volcoli.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `humanoid`. Types: `wood/cosmic`. Terminal — does not evolve.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/volcoli-sheet.png` → `public/assets/sprites/battle/volcoli-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
