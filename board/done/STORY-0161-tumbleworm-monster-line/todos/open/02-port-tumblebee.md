# Todo: Port tumblebee

Upstream: `upstream/mods/tuxemon/db/monster/tumblebee.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `flier`. Types: `venom`. Terminal form (evolves from `tumbleworm`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/tumblebee-sheet.png` → `public/assets/sprites/battle/tumblebee-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
