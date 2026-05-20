# Todo: Port flacono

Upstream: `upstream/mods/tuxemon/db/monster/flacono.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `flier`. Types: `sky`. Evolves to `corvix` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/flacono-sheet.png` → `public/assets/sprites/battle/flacono-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
