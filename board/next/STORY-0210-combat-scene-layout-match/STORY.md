# STORY-0210: Combat scene layout — match upstream after resolution + font changes

## Description

After STORY-0206 (256×144 viewport) and STORY-0208 (PressStart2P font), the combat scene drifted out of alignment with upstream. The HUDs, action menu, and prompt all need to be re-tuned to match.

### Reference screenshots

Both copies are in this story directory so the implementing agent doesn't have to dig around the host filesystem:

- `current.png` — our current rendering of a Pairagrin Lv2 vs Lambert Lv6 wild battle.
- `upstream-target.png` — upstream rendering the same kind of fight (Pairagrin♂ Lv.3 vs Lambert♂ Lv.8). This is the visual target.

### What's wrong today

1. **Monster name labels overflow the HUD panels.** "Pairagrin Lv2" on the enemy card runs off the right edge of the box. Our text is 8 px PressStart2P; upstream renders the same labels at a smaller size and fits "Pairagrin♂ Lv.3" inside the same 85 px-wide rect with room to spare.
2. **Bottom-bar text is oversized.** "What will Lambert do?" wraps to two lines in our 152 px-wide left panel — in upstream the same line fits on one line in the bottom-left panel. The action-menu labels (FIGHT / ITEM / TUXEMON / RUN) are visibly chunkier in ours.
3. **Player HUD column is over-stuffed.** The "DP" pip row currently overlaps the party-tray circles below. The HP panel + XP bar + DP pips + party tray all stack vertically and run out of room — upstream doesn't have DP and uses the same vertical band cleanly.

### Upstream numbers (all in 256×144 coordinates)

Pulled from `upstream/mods/combat_layouts.yaml` (single-player layout) and `upstream/tuxemon/states/combat_menus.py:118-122`:

**LEFT_COMBAT (player side):**
- Monster sprite area (`home`): `[0, 62, 96, 70]`
- HUD panel (`hud`): `[145, 45, 110, 50]`
- Party tuxeball strip (`party`): `[145, 57, 110, 50]` (offset 12 px below the HUD top)
- Name + level text (`hud_line1`): `[12, 11]` relative to the HUD origin → world (157, 56)
- HP bar (`hud_line2`): `[12, 19]` → world (157, 64)
- Monster island (`monster_box_home`): `[48, 108, 2, 2]`

**RIGHT_COMBAT (opponent side):**
- Monster sprite area: `[140, 18, 96, 70]`
- HUD panel: `[18, 0, 85, 30]`
- Party strip: `[18, 12, 85, 30]`
- Name + level text: `[5, 5]` → world (23, 5)
- HP bar: `[5, 13]` → world (23, 13)
- Monster island: `[188, 64, 2, 2]`

**Bottom UI:**
- Action menu rectangle (`combat_menus.py:116-122`): `102 × 36 px`, anchored to the bottom-right corner.
- Dialog/prompt rectangle (`combat_state.py:357-359`): full width × `screen_h // 4` = `256 × 36 px`, anchored bottom-right. The action menu sits inside the right portion of this band.

**HUD asset dimensions** (in `upstream/mods/tuxemon/gfx/ui/combat/`):
- `hp_player_nohp.png`: **104 × 37** px
- `hp_opponent_nohp.png`: **100 × 29** px

So the actual sprite assets are very close to the layout `hud` rect (110×50 / 85×30); the asset has a few pixels of transparent margin baked in. We're already using upstream's assets (`hud-player` / `hud-opponent` textures).

**Font sizes:** upstream's `FONT_SIZE` const is **5** (`upstream/tuxemon/platform/const/graphics.py:77`), used with PressStart2P at `scale_int(FONT_SIZE)`. At the default scale of 1 (i.e. rendering 1:1 to the 256×144 native frame, which is our case too), that's `5 pt` — closer to 5-6 source pixels of glyph height than the 8 px we're using.

### What to build

1. **Add a `SMALL` text style** (or rename — whatever fits the existing `src/game/ui/textStyle.ts` taxonomy) at PressStart2P 6 px. Try 5 px first; if PressStart2P at 5 px is unreadable in-browser, fall back to 6 px. Phaser will render the TTF at whatever pixel size we set; below the bitmap's native 8 px the glyphs lose perfect 1:1 alignment but still look pixel-art-y at integer canvas zooms. Verify by eye against the upstream screenshot.
2. **Apply the small style to:** monster name + level on both HUD panels, the four action-menu options, the "What will X do?" prompt, and the XP/DP/HP numeric labels if any. Anything else inside the 256×144 combat surface should also be re-evaluated — if it's currently 8 px and appears chunkier than upstream, drop it to 6.
3. **Re-tune CombatScene constants in `src/game/scenes/CombatScene.ts:23-67`** to match upstream's exact rectangles above. Specifically:
   - `ENEMY_HUD_X = 18, ENEMY_HUD_Y = 0` (currently 4, 2).
   - `enemyNameText` at `(ENEMY_HUD_X + 5, ENEMY_HUD_Y + 5)` (currently +6, +4).
   - `enemyHpY` at `(ENEMY_HUD_Y + 13)` (currently +16).
   - `PLAYER_HUD_X = 145, PLAYER_HUD_Y = 45` is **already correct** — no change.
   - `playerNameText` at `(PLAYER_HUD_X + 12, PLAYER_HUD_Y + 11)` (currently +12, +9).
   - `playerHpY` at `(PLAYER_HUD_Y + 19)` (currently +22).
   - Bottom band: `BOX_H = 36` (currently 48). Action menu in the bottom-right `102 × 36`. Prompt text in the remaining bottom-left `154 × 36`.
4. **Repack the player-side stack** so DP pips fit without overlapping the party tray. Options to consider (pick whichever looks closest to upstream and document the choice in `JOURNAL.md`):
   - Move DP pips **inside** the HP panel as a second row below the HP bar (using the extra vertical room saved by dropping `BOX_H` from 48 → 36).
   - Move DP pips **below** the party tray, accepting that the player column ends at the new `BOX_Y = 108`.
   - Keep DP between XP and party tray but shrink `DP_PIP_SIZE` from 5 → 3 and tighten `DP_PIP_GAP` accordingly.
   The HUD panel itself (`hud-player` asset, 104×37) has a fixed shape — anything we add inside it is a sprite overlay, anything outside is loose. Upstream doesn't need a DP indicator so there's no upstream-exact answer here; pick what looks balanced.
5. **Don't change the battle background, island sprites, or monster sprites.** Those are already correct per the upstream layout YAML.

### Engine-side considerations

- The existing `hud-player` / `hud-opponent` textures are the upstream assets at native size. Verify they're being drawn at 1×; no scaling should be applied.
- The dialog/menu border (`dialog-border` nine-slice) is shared with the standard dialog box. Whatever we do here should not break the bottom-of-screen dialog when an attack message scrolls through. Quick smoke check: trigger an attack, watch the "Lambert used X!" line render in the bottom band, verify it's not cut off at the new 36 px height. If it is, paginate (the dialog box already supports paging at `MAX_LINES_PER_PAGE`).
- The technique-info card on the left during attack selection (`CombatScene.ts` around the technique popup) currently assumes a 152 px-wide panel. Re-measure with the new bottom band.

### QA Validation

Add `qa/combat-layout-vs-upstream.ts` (checked in). Against the running dev server:

1. **Wild encounter screenshot.** Use `setupGame()` or the debug bridge to force a wild encounter against the same matchup shown in the references — a roughly L8 Lambert (player) vs L3 Pairagrin (enemy) — in a grass environment. Screenshot the initial decision-state frame (action menu open, prompt visible, both HUDs populated).
2. **Diff against `upstream-target.png`.** They won't be byte-identical (different background art, different palette, no DP in upstream), but: name labels must fit inside their HUD panels, action-menu labels must match upstream's text size, prompt must fit in the bottom-left without wrapping, party tray + DP indicators must not overlap, and the bottom band must be 36 px tall.
3. **Smoke: attack message in the bottom band.** Pick FIGHT → first technique. Screenshot the resulting "Lambert used X!" message. Verify the message fits in the 36 px band and the dialog box reaches the same width as upstream's prompt panel.
4. **Reference all screenshots in `JOURNAL.md`** alongside a note on which DP placement option was picked and why.

The implementing agent **MUST verify points 1-3 visually in a real browser** before flipping to `reviewing/`. Numbers can be right and the result can still look wrong — the upstream screenshot is the source of truth.

### Out of scope

- Gender markers (♂ / ♀) after the monster name. Upstream renders them via a glyph in `text_formatter`; we don't track gender on monsters yet. Note in `JOURNAL.md` if any text style or width assumption needs revisiting once gender is added.
- The XP bar styling. Upstream's XP bar is a slim cyan/yellow strip below the HUD panel; ours is currently absent or different. If the implementer naturally hits this while moving the HP panel, fine — otherwise defer.
- Restyling the dialog border / panel background. STORY-0208's follow-up scope.
- Math-quiz, monster-info, and other non-combat scenes. This story is combat-only.

## Acceptance Criteria

- [ ] `SMALL` (or equivalent) text style added to `src/game/ui/textStyle.ts` at the size that visually matches upstream (6 px target; 5 px if it renders cleanly)
- [ ] Monster name + level labels on both HUDs use the small style and fit inside their HUD panel rectangles
- [ ] Action menu (FIGHT / ITEM / TUXEMON / RUN) and the "What will X do?" prompt use the small style and match the upstream visible glyph size
- [ ] HUD positions in `CombatScene.ts` match the upstream layout numbers documented above (enemy at (18, 0) sized 85×30; player at (145, 45) sized 110×50)
- [ ] Bottom band is 36 px tall; action menu is 102 × 36 anchored bottom-right
- [ ] DP pips, party tray, HP bar, and XP bar all visible in the player column with no overlap
- [ ] `qa/combat-layout-vs-upstream.ts` exists, is checked in, captures the four required screenshots, and references them in `JOURNAL.md`
- [ ] Visual comparison against `upstream-target.png` confirms label fit, menu sizing, prompt sizing, and bottom-band height all match
- [ ] `npm run format:check && npm run lint && npx tsc --noEmit && npm test` all pass
