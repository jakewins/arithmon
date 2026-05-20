# Todo: Port tumbleworm

Upstream: `upstream/mods/tuxemon/db/monster/tumbleworm.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `grub`. Types: `venom`. Evolves to `tumblebee` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/tumbleworm-sheet.png` → `public/assets/sprites/battle/tumbleworm-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
