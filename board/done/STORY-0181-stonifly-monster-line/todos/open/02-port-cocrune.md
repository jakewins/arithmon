# Todo: Port cocrune

Upstream: `upstream/mods/tuxemon/db/monster/cocrune.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `blob`. Types: `earth/shadow`. Evolves to `runesquito` at `level 9`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/cocrune-sheet.png` → `public/assets/sprites/battle/cocrune-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
