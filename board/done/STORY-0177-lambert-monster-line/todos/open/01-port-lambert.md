# Todo: Port lambert

Upstream: `upstream/mods/tuxemon/db/monster/lambert.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `sprite`. Types: `wood`. Evolves to `legko` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/lambert-sheet.png` → `public/assets/sprites/battle/lambert-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
