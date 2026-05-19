# Todo: Port bursa

Upstream: `upstream/mods/tuxemon/db/monster/bursa.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `humanoid`. Types: `fire/cosmic`. Evolves to `flambear` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/bursa-sheet.png` → `public/assets/sprites/battle/bursa-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
