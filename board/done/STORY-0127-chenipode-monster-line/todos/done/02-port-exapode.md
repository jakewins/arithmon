# Todo: Port exapode

Upstream: `upstream/mods/tuxemon/db/monster/exapode.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `grub`. Types: `normal`. Terminal form (evolves from `chenipode`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/exapode-sheet.png` → `public/assets/sprites/battle/exapode-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
