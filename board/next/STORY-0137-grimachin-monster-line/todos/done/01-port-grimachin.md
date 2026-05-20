# Todo: Port grimachin

Upstream: `upstream/mods/tuxemon/db/monster/grimachin.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `hunter`. Types: `metal`. Evolves to `tigrock` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/grimachin-sheet.png` → `public/assets/sprites/battle/grimachin-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
