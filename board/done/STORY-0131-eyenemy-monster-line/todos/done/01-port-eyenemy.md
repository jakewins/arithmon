# Todo: Port eyenemy

Upstream: `upstream/mods/tuxemon/db/monster/eyenemy.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `serpent`. Types: `cosmic`. Evolves to `eyesore` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/eyenemy-sheet.png` → `public/assets/sprites/battle/eyenemy-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
