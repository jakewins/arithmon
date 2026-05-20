# Todo: Port rockitten

Upstream: `upstream/mods/tuxemon/db/monster/rockitten.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `hunter`. Types: `earth`. Evolves to `rockat` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/rockitten-sheet.png` → `public/assets/sprites/battle/rockitten-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
