# Todo: Port katacoon

Upstream: `upstream/mods/tuxemon/db/monster/katacoon.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `grub`. Types: `metal/venom`. Evolves to `bugnin;sumchon;gladiatorbug` at `level 9`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/katacoon-sheet.png` → `public/assets/sprites/battle/katacoon-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
