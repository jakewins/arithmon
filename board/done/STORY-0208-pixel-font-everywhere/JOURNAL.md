# STORY-0208 — Implementation Journal

## Summary

Rolled out upstream Tuxemon's `PressStart2P.ttf` pixel font across every UI text surface in the game. Replaced the browser-default Arial fallback (which was mushy at 8 px on the 256×144 canvas) with the same bitmap font upstream ships — chunky, grid-aligned, crisp at every integer zoom.

## Implementation

### Font load (no flash of fallback)

- Vendored `PressStart2P.ttf` + `OFL.txt` into `public/assets/font/`.
- Added an `@font-face` block in `public/style.css` so the browser starts fetching during initial HTML parse.
- Added `ensureUiFontLoaded()` in `src/game/ui/textStyle.ts`; `main.ts` awaits it before constructing `new Game()` so the first frame already paints in PressStart2P.

### Shared text-style constants

`src/game/ui/textStyle.ts` exports a small palette:

- `BODY` — 8 px, dark — the default for menus, dialog, HUD labels.
- `BODY_LIGHT` — 8 px, white — combat HUD names, math-quiz on dark backdrop.
- `HEADING` — 8 px, bold — section headers (Evolutions, etc.).
- `TITLE` — 16 px, white, bold — title-screen header.
- `NAME` — 16 px, bold — monster name on MonsterInfoScene.
- `BIG_LIGHT` — 16 px, white — math-quiz comparison digits.
- Helpers: `withColor(base, color)`, `withWrap(base, width, align)`.

Every one of the 16 affected files imports from this module; the only `fontSize:` strings left in the codebase live inside `textStyle.ts`.

### Per-scene layout fixes

PressStart2P glyphs render ~7 px wide vs Arial's ~5 px. Two cascading layout adjustments fell out of that:

- **`PartyScreen`** — left-panel detail (portrait + stats + moves) was laid out side-by-side and overflowed. Reorganised: portrait top-left, stats column to its right, techniques stacked below. Stat labels switched from double-space (`"HP  48/48"`) to single (`"HP 48/48"`).
- **`monsterPortrait.ts`** — XP bar shrank 64 → 48 px so the label + bar fit inside the new 72 px stats column. Technique line dropped parens: `"Stick (2DP)"` → `"Stick 2DP"`.
- **`monsterSlot.ts`** — HP bar shrank 50 → 36 px to make room for the wider "99/99" text. HP bar/text moved from y=11/y=8 to y=13/y=10 so PressStart2P's taller line box no longer overlaps the name.
- **`PauseMenuScene`** — panel widened 70 → 80 px so "Tuxemon"/"Journal" (56 px each) clear the right border.
- **`CombatScene`** — `LEFT_W` shrank 152 → 120 px so the right-panel 2×2 menu can fit "TUXEMON" (56 px) per column. DP-label pip offset bumped 12 → 18 px so the "DP" label clears the first pip.
- **`monsterPortrait` / `monsterSlot`** — replaced the local `TEXT_COLOR` const with the central `BODY` style.

### QA

`qa/pixel-font-readability.ts` (checked in) captures 19 screenshots covering every surface in the story brief:

- `font-01-title-screen.png` — TitleScene (verifies font is in the FontFaceSet before first frame).
- `font-02-dialog-bedroom-intro.png` — short DialogBox ("Do you want to skip the intro?").
- `font-03-dialog-multiline.png` — multi-line spyder_intro00 dialog (matches the upstream reference shape).
- `font-04-pause-menu.png` — PauseMenuScene.
- `font-05-party-screen.png` — PartyScreen with portrait + stats + moves + slot list.
- `font-06-journal-list.png` — JournalScene index.
- `font-07-bag-scene.png` — BagScene item list + description.
- `font-08-monster-info.png` — MonsterInfoScene (Budaye).
- `font-09-shop-scene.png` — ShopScene buy tab.
- `font-10-math-problem.png` — MathProblemScene blank prompt.
- `font-11-math-problem-feedback.png` — math feedback line ("INCORRECT — answer was 12").
- `font-12-combat-main-menu.png` — CombatScene 2×2 main menu.
- `font-13-combat-tech-menu.png` — techniques popup + info card.
- `font-16-set-bubble.png` — `set_bubble` overlay (Dante NPC inspection in scoop intro).
- `font-17-rename-player.png` — `rename_player` overlay.
- `font-18-translated-dialog-choice.png` — `translated_dialog_choice` overlay (Confirm starter).
- `font-19-choice-monster.png` — `choice_monster` overlay (starter picker).

Visual verification: all dialog/menu text renders in PressStart2P; no flash of fallback Arial on boot; no clipping past panel boundaries.

## Files

- `public/assets/font/PressStart2P.ttf` (new, vendored)
- `public/assets/font/OFL.txt` (new, vendored license)
- `public/style.css` — `@font-face` block.
- `src/game/main.ts` — awaits `ensureUiFontLoaded()` before Phaser boots.
- `src/game/ui/textStyle.ts` (new) — shared style constants + font loader.
- `src/game/event/ui/dialogBox.ts`
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
- `qa/pixel-font-readability.ts` (new) — checked-in QA suite.

## Notes for follow-ups

- The `XP` / `HP` text and bar baked into `hud-player.png` / `hud-opponent.png` still renders in the original art's typeface — that's a sprite-sheet asset, not a Phaser text node. Out of scope here; would need a sprite-replacement story.
- Dialog border / panel background is unchanged per the story's "out of scope" note. Upstream's purple-on-white panel can come later.
- Non-ASCII strings haven't been audited — PressStart2P's character coverage stops at basic Latin. If we ever ship CJK content we'll need the upstream fallback fonts in `upstream/mods/tuxemon/font/`.

## 2026-05-20 — Reviewer findings (Approved)

- Confirmed `public/assets/font/PressStart2P.ttf` is byte-for-byte identical to
  `upstream/mods/tuxemon/font/PressStart2P.ttf` (`cmp` returns 0).
- `@font-face` block in `public/style.css` with `font-display: block` + `main.ts`
  awaiting `ensureUiFontLoaded()` before `new Game()` — correct no-flash boot.
- `grep -r "fontSize:" src/game/` returns zero results outside `textStyle.ts`;
  `grep -r "fontFamily:" src/game/` likewise. Every `add.text(...)` call spreads
  or directly passes a `textStyle.ts` constant (`BODY`, `BODY_LIGHT`, `HEADING`,
  `TITLE`, `BIG_LIGHT`, `NAME`, `withColor`, `withWrap`) — acceptance criterion
  met.
- Spot-checked `dialogBox.ts`, `CombatScene.ts`, `PauseMenuScene.ts`,
  `MathProblemScene.ts`, `translatedDialogChoice.ts`, `renamePlayer.ts` — all
  migrate cleanly to shared constants; no inline `fontSize` or browser-default
  font survives.
- Visual QA via Puppeteer: `document.fonts.check('8px "PressStart2P"')` returns
  `true` at first render (before any scene interaction). Screenshots confirmed:
  - Title screen: "Arithmon" header and subtitle in crisp PressStart2P.
  - Pause menu: "Tuxemon / Journal / Bag / Save / Close" grid-aligned,
    no overflow past panel right edge (80 px panel fits "Tuxemon" + "Journal").
  - Combat scene: "Budaye Lv5", "What will Budaye do?", "FIGHT / TUXEMON / ITEM
    / RUN" 2×2 menu, "DP" purple label — all PressStart2P, no clipping.
- Re-ran pre-commit gates (`format:check / lint / tsc --noEmit / npm test`):
  42 test files, 465 tests pass.
- `qa/pixel-font-readability.ts` (489 lines) is checked in and covers 17
  labelled scenes — appropriate coverage for a visual-only migration story.
