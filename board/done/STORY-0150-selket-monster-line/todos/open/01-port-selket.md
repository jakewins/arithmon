# Todo: Port selket

Upstream: `upstream/mods/tuxemon/db/monster/selket.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `grub`. Types: `earth/venom`. Evolves to `selmatek` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/selket-sheet.png` → `public/assets/sprites/battle/selket-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
