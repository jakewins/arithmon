# Todo: Port chrome_robo

Upstream: `upstream/mods/tuxemon/db/monster/chrome_robo.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `humanoid`. Types: `metal`. Terminal — does not evolve.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/chrome_robo-sheet.png` → `public/assets/sprites/battle/chrome_robo-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
