# Todo: Port chromeye

Upstream: `upstream/mods/tuxemon/db/monster/chromeye.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `blob`. Types: `metal/cosmic`. Evolves to `angrito;happito;neutrito;sadito` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/chromeye-sheet.png` → `public/assets/sprites/battle/chromeye-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
