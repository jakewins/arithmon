# Todo: Port helipi

Upstream: `upstream/mods/tuxemon/db/monster/helipi.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `blob`. Types: `wood/sky`. Evolves to `coppi` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/helipi-sheet.png` → `public/assets/sprites/battle/helipi-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
