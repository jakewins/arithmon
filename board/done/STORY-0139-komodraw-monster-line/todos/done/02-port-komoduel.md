# Todo: Port komoduel

Upstream: `upstream/mods/tuxemon/db/monster/komoduel.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `humanoid`. Types: `normal`. Terminal form (evolves from `komodraw`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/komoduel-sheet.png` → `public/assets/sprites/battle/komoduel-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
