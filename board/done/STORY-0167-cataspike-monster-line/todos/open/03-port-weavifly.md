# Todo: Port weavifly

Upstream: `upstream/mods/tuxemon/db/monster/weavifly.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `grub`. Types: `metal/sky`. Terminal form (evolves from `puparmor`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/weavifly-sheet.png` → `public/assets/sprites/battle/weavifly-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
