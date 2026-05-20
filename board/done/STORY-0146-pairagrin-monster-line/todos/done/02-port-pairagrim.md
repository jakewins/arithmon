# Todo: Port pairagrim

Upstream: `upstream/mods/tuxemon/db/monster/pairagrim.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `flier`. Types: `sky`. Terminal form (evolves from `pairagrin`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/pairagrim-sheet.png` → `public/assets/sprites/battle/pairagrim-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
