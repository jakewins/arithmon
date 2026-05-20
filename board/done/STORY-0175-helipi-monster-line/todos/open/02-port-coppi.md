# Todo: Port coppi

Upstream: `upstream/mods/tuxemon/db/monster/coppi.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `blob`. Types: `wood/sky`. Evolves to `parappi` at `level 15`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/coppi-sheet.png` → `public/assets/sprites/battle/coppi-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
