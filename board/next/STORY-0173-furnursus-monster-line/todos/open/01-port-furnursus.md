# Todo: Port furnursus

Upstream: `upstream/mods/tuxemon/db/monster/furnursus.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `humanoid`. Types: `fire`. Evolves to `statursus` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/furnursus-sheet.png` → `public/assets/sprites/battle/furnursus-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
