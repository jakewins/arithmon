# Todo: Port axolightl

Upstream: `upstream/mods/tuxemon/db/monster/axolightl.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `polliwog`. Types: `water`. Evolves to `ampystoma` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/axolightl-sheet.png` → `public/assets/sprites/battle/axolightl-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
