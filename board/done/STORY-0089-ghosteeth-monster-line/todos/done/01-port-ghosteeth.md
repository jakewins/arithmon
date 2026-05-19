# Todo: Port ghosteeth

Upstream: `upstream/mods/tuxemon/db/monster/ghosteeth.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `blob`. Types: `shadow`. Terminal — does not evolve.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/ghosteeth-sheet.png` → `public/assets/sprites/battle/ghosteeth-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
