# Todo: Port tarpeur

Upstream: `upstream/mods/tuxemon/db/monster/tarpeur.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `grub`. Types: `wood`. Evolves to `vigueur` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/tarpeur-sheet.png` → `public/assets/sprites/battle/tarpeur-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
