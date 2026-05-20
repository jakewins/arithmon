# Todo: Port cataspike

Upstream: `upstream/mods/tuxemon/db/monster/cataspike.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `grub`. Types: `metal/venom`. Evolves to `puparmor` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/cataspike-sheet.png` → `public/assets/sprites/battle/cataspike-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
