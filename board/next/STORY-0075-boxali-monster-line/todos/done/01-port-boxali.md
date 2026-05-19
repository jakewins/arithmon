# Todo: Port boxali

Upstream: `upstream/mods/tuxemon/db/monster/boxali.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `brute`. Types: `heroic/sky`. Terminal — does not evolve.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/boxali-sheet.png` → `public/assets/sprites/battle/boxali-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
