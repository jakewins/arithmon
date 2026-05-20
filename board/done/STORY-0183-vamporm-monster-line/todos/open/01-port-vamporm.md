# Todo: Port vamporm

Upstream: `upstream/mods/tuxemon/db/monster/vamporm.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `grub`. Types: `venom/shadow`. Evolves to `dracune` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/vamporm-sheet.png` → `public/assets/sprites/battle/vamporm-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
