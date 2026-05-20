# Todo: Port tweesher

Upstream: `upstream/mods/tuxemon/db/monster/tweesher.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `flier`. Types: `frost`. Evolves to `heronquak` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/tweesher-sheet.png` → `public/assets/sprites/battle/tweesher-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
