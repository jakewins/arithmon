# Todo: Port chenipode

Upstream: `upstream/mods/tuxemon/db/monster/chenipode.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `grub`. Types: `normal`. Evolves to `exapode` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/chenipode-sheet.png` → `public/assets/sprites/battle/chenipode-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
