# Todo: Port forturtle

Upstream: `upstream/mods/tuxemon/db/monster/forturtle.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `humanoid`. Types: `cosmic`. Evolves to `prophetoise` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/forturtle-sheet.png` → `public/assets/sprites/battle/forturtle-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
