# Todo: Port botbot

Upstream: `upstream/mods/tuxemon/db/monster/botbot.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `grub`. Types: `metal`. Evolves to `av8r;picc;mrmoswitch;k9;b_ver_1` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/botbot-sheet.png` → `public/assets/sprites/battle/botbot-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
