# Todo: Port cardiling

Upstream: `upstream/mods/tuxemon/db/monster/cardiling.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `flier`. Types: `fire/sky`. Evolves to `cardiwing` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/cardiling-sheet.png` → `public/assets/sprites/battle/cardiling-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
