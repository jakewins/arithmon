# Todo: Port fluoresfin

Upstream: `upstream/mods/tuxemon/db/monster/fluoresfin.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `piscine`. Types: `lightning/water`. Evolves to `incandesfin` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/fluoresfin-sheet.png` → `public/assets/sprites/battle/fluoresfin-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
