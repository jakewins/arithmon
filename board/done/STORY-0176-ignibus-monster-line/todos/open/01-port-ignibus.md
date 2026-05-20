# Todo: Port ignibus

Upstream: `upstream/mods/tuxemon/db/monster/ignibus.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `polliwog`. Types: `fire`. Evolves to `eruptibus;eruptibus;embazook;embazook` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/ignibus-sheet.png` → `public/assets/sprites/battle/ignibus-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
