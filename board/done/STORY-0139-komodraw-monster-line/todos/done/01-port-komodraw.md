# Todo: Port komodraw

Upstream: `upstream/mods/tuxemon/db/monster/komodraw.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `humanoid`. Types: `normal`. Evolves to `komoduel` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/komodraw-sheet.png` → `public/assets/sprites/battle/komodraw-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
