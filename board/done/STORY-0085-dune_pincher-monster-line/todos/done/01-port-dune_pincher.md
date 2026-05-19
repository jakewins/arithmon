# Todo: Port dune_pincher

Upstream: `upstream/mods/tuxemon/db/monster/dune_pincher.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `grub`. Types: `normal`. Terminal — does not evolve.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/dune_pincher-sheet.png` → `public/assets/sprites/battle/dune_pincher-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
