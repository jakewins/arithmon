# Todo: Port araignee

Upstream: `upstream/mods/tuxemon/db/monster/araignee.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `grub`. Types: `venom`. Terminal — does not evolve.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/araignee-sheet.png` → `public/assets/sprites/battle/araignee-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
