# Todo: Port snaki

Upstream: `upstream/mods/tuxemon/db/monster/snaki.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `serpent`. Types: `normal`. Evolves to `snokari` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/snaki-sheet.png` → `public/assets/sprites/battle/snaki-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
