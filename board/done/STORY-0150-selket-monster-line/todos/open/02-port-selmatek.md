# Todo: Port selmatek

Upstream: `upstream/mods/tuxemon/db/monster/selmatek.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `grub`. Types: `earth/venom`. Terminal form (evolves from `selket`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/selmatek-sheet.png` → `public/assets/sprites/battle/selmatek-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
