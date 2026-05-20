# Todo: Port fluttaflap

Upstream: `upstream/mods/tuxemon/db/monster/fluttaflap.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `grub`. Types: `sky/shadow`. Terminal form (evolves from `dracune`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/fluttaflap-sheet.png` → `public/assets/sprites/battle/fluttaflap-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
