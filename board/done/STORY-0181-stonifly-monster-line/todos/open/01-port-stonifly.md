# Todo: Port stonifly

Upstream: `upstream/mods/tuxemon/db/monster/stonifly.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `grub`. Types: `earth`. Evolves to `cocrune` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/stonifly-sheet.png` → `public/assets/sprites/battle/stonifly-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
