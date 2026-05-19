# Todo: Port brewdin

Upstream: `upstream/mods/tuxemon/db/monster/brewdin.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `varmint`. Types: `water/shadow`. Terminal — does not evolve.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/brewdin-sheet.png` → `public/assets/sprites/battle/brewdin-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
