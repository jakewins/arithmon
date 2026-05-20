# Todo: Port vivipere

Upstream: `upstream/mods/tuxemon/db/monster/vivipere.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `serpent`. Types: `normal`. Evolves to `vivicinder;viviphyta;viviteel;vivitrans;vivitron;vividactil;vividactil;vividactil;vivisource` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/vivipere-sheet.png` → `public/assets/sprites/battle/vivipere-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
