# Todo: Port pairagrin

Upstream: `upstream/mods/tuxemon/db/monster/pairagrin.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `flier`. Types: `sky`. Evolves to `pairagrim` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/pairagrin-sheet.png` → `public/assets/sprites/battle/pairagrin-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
