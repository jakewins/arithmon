# Todo: Port toxiris

Upstream: `upstream/mods/tuxemon/db/monster/toxiris.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `humanoid`. Types: `wood/venom`. Evolves to `ninjasmine` at `level 32`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/toxiris-sheet.png` → `public/assets/sprites/battle/toxiris-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
