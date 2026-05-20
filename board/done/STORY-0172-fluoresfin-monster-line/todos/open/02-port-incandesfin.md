# Todo: Port incandesfin

Upstream: `upstream/mods/tuxemon/db/monster/incandesfin.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `piscine`. Types: `lightning/water`. Evolves to `lightmare` at `level 18`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/incandesfin-sheet.png` → `public/assets/sprites/battle/incandesfin-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
