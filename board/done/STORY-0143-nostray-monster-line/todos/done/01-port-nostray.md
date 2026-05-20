# Todo: Port nostray

Upstream: `upstream/mods/tuxemon/db/monster/nostray.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `piscine`. Types: `water`. Evolves to `shnark` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/nostray-sheet.png` → `public/assets/sprites/battle/nostray-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
