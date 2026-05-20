# STORY-0208: Adopt upstream's PressStart2P pixel font across all UI text

## Description

After STORY-0206 dropped the logical resolution to 256×144, every text-rendering surface in the game became hard to read. The dialog box is the most visible offender, but the same problem affects every menu, combat panel, math quiz, etc. — anywhere we call Phaser's `add.text(...)`.

The cause isn't size or layout; it's the **font face**. Upstream Tuxemon ships `PressStart2P.ttf` (`upstream/tuxemon/config.py:64`) — a bitmap-pixel font designed to render crisp at single-digit pixel sizes. We don't set `fontFamily` anywhere, so Phaser falls back to the browser default (Arial-ish sans-serif). At 8 px on a 256-wide canvas integer-scaled ~6×, the AA on those thin glyphs blows up into mushy fuzz. Upstream looks chunky and legible because PressStart2P's 8×8 bitmap glyphs stay grid-aligned at every integer zoom.

### Reference

`~/Pictures/Screenshots/20260520_215215.png` — upstream's dialog box rendering "Welcome customer. Today, we're promoting Tuxeballs. Do you know what those are?" across three lines. Note: the upstream `MAX_LINES_PER_PAGE` is 4, matching ours; line metrics are similar. The visible legibility delta is the font face alone.

### What's broken today

`grep -rln 'fontSize:\|fontFamily:' src/game/ | wc -l` returns **16 files** that render text, with ~116 individual `fontSize` declarations and **zero** `fontFamily` declarations. Affected modules:

- `src/game/event/ui/dialogBox.ts` (the standard dialog — most visible)
- `src/game/event/actions/translatedDialogChoice.ts`
- `src/game/event/actions/choiceMonster.ts`
- `src/game/event/actions/renamePlayer.ts`
- `src/game/event/actions/setBubble.ts`
- `src/game/scenes/CombatScene.ts`
- `src/game/scenes/MathProblemScene.ts`
- `src/game/scenes/MonsterInfoScene.ts`
- `src/game/scenes/PartyScreen.ts`
- `src/game/scenes/ShopScene.ts`
- `src/game/scenes/BagScene.ts`
- `src/game/scenes/JournalScene.ts`
- `src/game/scenes/PauseMenuScene.ts`
- `src/game/scenes/TitleScene.ts`
- `src/game/ui/monsterPortrait.ts`
- `src/game/ui/monsterSlot.ts`

All of them currently render at the browser default. All of them need to migrate.

### What to build

1. **Vendor the font.** Copy `upstream/mods/tuxemon/font/PressStart2P.ttf` into `public/assets/font/PressStart2P.ttf`. It's GPL-licensed and already in the upstream tree we reference.
2. **Load it once at boot.** PressStart2P needs to be available to Phaser before any scene's `create()` runs text — otherwise the first frame paints in the fallback. Two viable approaches; pick whichever is cleanest:
   - Inject `@font-face` in `index.html` / a global CSS file, then reference the family name in Phaser text styles. Use `document.fonts.ready` (or a small async preloader) so we don't flash unstyled text.
   - Add a Phaser preloader scene that uses `WebFont.load` (Phaser ships a loader for Google Web Fonts; for self-hosted TTFs use the FontFace API directly) and gates the rest of boot on success.
   - Either way, **the first text we render must already use the loaded font** — no fallback flash.
3. **Centralize text style.** Add `src/game/ui/textStyle.ts` (or extend an existing module) exporting a small set of named styles — at minimum `BODY`, maybe `SMALL`, `HEADING`. Each is `{ fontFamily: "PressStart2P", fontSize: "Npx", color, lineSpacing }`. Migrate every `add.text(...)` call to spread one of these constants instead of inlining `fontSize: "8px"`. Replace the existing 116 raw `fontSize` strings.
4. **Audit per-scene layout.** PressStart2P is a fixed-width 8×8 font with different metrics than Arial — letter width is wider, line height is taller. Expect text that previously fit to overflow or wrap differently. For each migrated scene:
   - Walk through it in the browser.
   - Verify nothing clips outside its panel.
   - Verify menu cursors still align with their rows.
   - Verify wrapped text uses the same line count as before (or adjust the panel if it doesn't).
   - This is the bulk of the work. **Do not** try to do it all without launching the game between changes.
5. **Don't touch the dialog border yet.** Style of the box itself (background color, border art) is out of scope; this story is purely font. A follow-up can address upstream's purple-on-white panel.

### QA Validation

Add `qa/pixel-font-readability.ts` (checked in). Against the running dev server:

1. **Standard dialog box.** Trigger the same dialog as the upstream reference (any `translated_dialog` from `spyder_paper_scoop` or similar — pick one whose text wraps to 3–4 lines). Screenshot. Diff visually against `~/Pictures/Screenshots/20260520_215215.png`. They won't be pixel-identical (different palette, different scene behind the box), but the dialog text should be **the same chunky bitmap font, same approximate glyph proportions, same readability**.
2. **Every scene listed above.** Open each (combat, math quiz, monster info, party screen, shop, bag, journal, pause menu, title, dialog choice, rename player, set bubble). Screenshot each. Reference all screenshots in `JOURNAL.md`.
3. **No layout regressions.** Verify text doesn't clip past panel boundaries in any of those screenshots. Verify menu cursors still align. If anything's broken, fix it before flipping the story to `reviewing/`.
4. **Font is loaded before first paint.** Verify there's no visible flash of the fallback Arial during boot. The simplest check: hard-refresh with cache disabled; the title screen text should be PressStart2P on the very first rendered frame.

The implementing agent **MUST verify all four points by screenshot in a real browser before flipping to `reviewing/`**. Tests pass != UI looks right.

### Out of scope

- Dialog border / panel background restyling (separate story).
- Adding a second font (heading vs body) — one shared font is fine for now.
- Internationalization fonts (the CJK fallbacks in upstream's font/ dir). Add a note in JOURNAL if non-ASCII strings break.
- Re-running per-scene QA scripts that already existed before this story. Spot-check them; don't rewrite them.

## Acceptance Criteria

- [ ] `public/assets/font/PressStart2P.ttf` exists; loaded at boot via `@font-face` or FontFace API; available to Phaser before any text is rendered
- [ ] `src/game/ui/textStyle.ts` (or equivalent) exists with named text-style constants; every `add.text(...)` site across the 16 affected files uses these constants instead of inline `fontSize` strings
- [ ] `grep -r "fontSize:" src/game/` returns matches only inside `textStyle.ts` (or a similar central module); raw `fontSize: "Npx"` strings sprinkled across scenes are gone
- [ ] No `add.text(...)` call relies on the browser default font; every text style sets `fontFamily: "PressStart2P"` (or whatever the shared name is)
- [ ] All 16 listed files have been opened in the browser and visually verified post-migration; per-scene clipping/alignment issues fixed
- [ ] `qa/pixel-font-readability.ts` exists, is checked in, and captures screenshots of the standard dialog + every migrated scene; referenced in `JOURNAL.md`
- [ ] Standard dialog box visually matches upstream's font in `20260520_215215.png` (chunky bitmap font, crisp at integer zoom)
- [ ] No flash of fallback Arial during boot
- [ ] `npm run format:check && npm run lint && npx tsc --noEmit && npm test` all pass
