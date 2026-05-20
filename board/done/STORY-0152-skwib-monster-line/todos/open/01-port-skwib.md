# Todo: Port skwib

Upstream: `upstream/mods/tuxemon/db/monster/skwib.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `polliwog`. Types: `normal`. Evolves to `octabode` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/skwib-sheet.png` → `public/assets/sprites/battle/skwib-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
