# Todo: Port chillimp

Upstream: `upstream/mods/tuxemon/db/monster/chillimp.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `brute`. Types: `frost/heroic`. Evolves to `snowrilla` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/chillimp-sheet.png` → `public/assets/sprites/battle/chillimp-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
