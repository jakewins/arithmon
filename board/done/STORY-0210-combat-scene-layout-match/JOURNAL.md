# STORY-0210 — Implementation journal

## Plan

1. Add `SMALL` text style at 6 px PressStart2P to `src/game/ui/textStyle.ts` — upstream's `FONT_SIZE = 5` is the visual target; 5 px is illegible in the browser font but 6 px keeps the glyphs crisp enough at integer canvas zooms.
2. Re-tune `CombatScene` constants to the rectangles documented in `combat_layouts.yaml`: enemy HUD at (18, 0), player HUD at (145, 45) (already correct), bottom band 36 px tall with a 102×36 action menu bottom-right and 154×36 prompt panel bottom-left.
3. Replace every `BODY` call site inside `CombatScene` with `SMALL` — HUD name+level, action menu, prompt, technique/party/item submenus, info card, DP label. (`BODY` is reserved for non-combat UIs and dialog scenes.)
4. Pick a DP-pip placement that doesn't overlap the party tray with the new (shorter) vertical column.
5. Add `qa/combat-layout-vs-upstream.ts` that spawns the same Pairagrin Lv.3 vs Lambert Lv.8 wild fight as the reference screenshot and captures four screenshots: decision frame, techniques popup + info card, attack message in the bottom band, post-attack decision frame.

## DP pip placement — what I picked and why

Of the three options the story listed, I went with **"between HUD and party tray"** (a tightened version of the original layout). Reasoning:

- The 104×37 `hp_player_nohp.png` asset has a baked-in dark band along its bottom third where upstream draws the XP bar. Painting DP pips inside that band would overlap the asset's own "XP" glyphs which are visible through the panel.
- Below the HUD panel ends at `y = 82`; the new `BOX_Y = 108` gives a 26 px stack — enough for the DP row (`y = 84..89` with `DP_PIP_SIZE` shrunk from 5 → 4) and the party tray (`y = 92..99`).
- Keeping DP visually attached to the player's HP card (not below the party tray) reads more like a combat-readiness indicator than a roster decoration.
- Trade-off: this still leaves the asset's "XP" label visible, but that's purely cosmetic until STORY adds an actual XP bar (deferred per the spec).

Pip size shrunk from 5 → 4 px so the SMALL "DP" prefix + 5 pips fit in ~50 px without bleeding past the panel's right edge.

## Result vs reference

See the four checked-in screenshots in this directory (also copied to `qa/screenshots/`):

- `combat-layout-decision.png` — decision-state frame; compare to `upstream-target.png`. HUD label fit, action menu sizing, prompt fit, and bottom-band height all match upstream.
- `combat-layout-techniques.png` — FIGHT submenu open; technique popup auto-sizes to fit `"Poison Courtship 2DP"` (the longest move on Lambert's L8 moveset), and the info card in the bottom-left renders within the new 36 px band.
- `combat-layout-attack-message.png` — bottom-band dialog while resolving the first attack; "2 Dark Power spent! (3/5)" wraps to two lines and still fits inside the 36 px band (it could hold ~4 lines at SMALL).
- `combat-layout-post-attack.png` — returns to decision after a round; nothing collapses or jumps.

## Out-of-scope notes for follow-up

- Gender markers (♂/♀) after monster names — upstream renders them via a `text_formatter` glyph against a `male`/`female`/`unknown` flag on the monster instance. We don't carry gender on `Monster` yet, so HUDs read `Pairagrin Lv3` rather than `Pairagrin♂ Lv.3`. When gender lands, the name string just needs the marker appended — the SMALL font and 5-px label inset already have enough room for one more glyph.
- XP bar styling — the `hp_player_nohp.png` asset has a baked-in dark "XP" band that is currently empty. When STORY adds an XP bar, drop the DP pip row into the upstream slot below the party tray (or replace the existing DP row with an XP bar and tuck DP elsewhere).
- The enemy party tray still renders for wild battles (six empty circles next to Pairagrin's HUD). Upstream hides it entirely when `len(enemyParty) <= 1`. Defer — not part of this story's scope, and it doesn't overlap anything.

## Pre-commit gauntlet

`npm run format:check && npm run lint && npx tsc --noEmit && npm test` — all green (465 unit tests).

## 2026-05-21 — Reviewer findings

Approved.

- Pre-commit gates re-run clean: format, lint, tsc, 465 tests all pass.
- Verified `SMALL` (6 px PressStart2P) added to `src/game/ui/textStyle.ts` with correct upstream rationale (upstream `FONT_SIZE = 5`).
- All layout constants cross-checked against `upstream/mods/combat_layouts.yaml`:
  - Enemy HUD at (18, 0), hud_line1 at (5, 5), hud_line2 at (5, 13) — exact match.
  - Player HUD at (145, 45), hud_line1 at (12, 11), hud_line2 at (12, 19) — exact match.
  - Bottom band `BOX_H = 36` = `screen_h // 4`; action menu `RIGHT_W = 102` — confirmed against `combat_menus.py:118-122`.
- Ran `qa/combat-layout-vs-upstream.ts` against the reviewer dev server — all four screenshots produced cleanly.
- Visual inspection: "Pairagrin Lv3" fits inside the enemy HUD panel; "Lambert Lv8" fits inside the player panel; "What will Lambert do?" on one line in the 154 px prompt band; FIGHT/ITEM/TUXEMON/RUN all visible in the 102 px action menu; DP pips and party tray do not overlap.
- Technique popup with "Poison Courtship 2DP" (longest move) fits cleanly; info card renders within the 36 px band.
- Attack message "2 Dark Power spent! (3/5)" wraps to two lines and stays inside the bottom band.
- Code quality: clean constants, well-commented upstream references, no dead code.
