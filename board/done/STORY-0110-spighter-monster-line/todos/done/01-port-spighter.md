# Todo: Port spighter

Upstream: `upstream/mods/tuxemon/db/monster/spighter.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `grub`. Types: `venom/shadow`. Terminal — does not evolve.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/spighter-sheet.png` → `public/assets/sprites/battle/spighter-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
