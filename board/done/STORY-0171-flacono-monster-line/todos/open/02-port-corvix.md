# Todo: Port corvix

Upstream: `upstream/mods/tuxemon/db/monster/corvix.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `flier`. Types: `sky`. Evolves to `gryfix` at `level 18`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/corvix-sheet.png` → `public/assets/sprites/battle/corvix-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
