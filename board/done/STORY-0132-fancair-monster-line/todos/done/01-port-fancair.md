# Todo: Port fancair

Upstream: `upstream/mods/tuxemon/db/monster/fancair.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `sprite`. Types: `lightning/sky`. Evolves to `windeye` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/fancair-sheet.png` → `public/assets/sprites/battle/fancair-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
