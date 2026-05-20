# Todo: Port puparmor

Upstream: `upstream/mods/tuxemon/db/monster/puparmor.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `blob`. Types: `metal/venom`. Evolves to `weavifly` at `level 9`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/puparmor-sheet.png` → `public/assets/sprites/battle/puparmor-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
