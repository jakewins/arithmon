# Todo: Port volconey

Upstream: `upstream/mods/tuxemon/db/monster/volconey.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `varmint`. Types: `fire/normal`. Terminal form (evolves from `thumpurn`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/volconey-sheet.png` → `public/assets/sprites/battle/volconey-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
