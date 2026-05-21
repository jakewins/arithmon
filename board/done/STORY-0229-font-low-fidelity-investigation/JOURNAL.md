# JOURNAL — STORY-0229

## Root cause: H1 confirmed

PressStart2P's TTF outlines are designed for 8 px integer multiples. At the
6 px we used for `SMALL` (and 5 px upstream's `FONT_SIZE`), the browser
rasteriser couldn't hint glyphs onto the pixel grid cleanly — each design
unit landed on either 6 or 7 internal-canvas pixels irregularly, and the
NEAREST-sampled upscale baked that irregularity into the visible "fat
ungridded blocks" of `example-combat-screen.png`. STORY-0211's
`setResolution(zoom)` flattened the AA halo but the underlying off-grid
rasterisation was a property of the typeface itself.

## Verification — H1 sweep

`qa/local/font-size-sweep.ts` (vendored throwaway) rendered "What will
Lambert do?" at 5, 6, 7, 8, 10, 12, 14, 16 px PressStart2P with
`setResolution(zoom)` in the live game, then again in Pizel for comparison.
Result, captured to `font-comparison.png`:

- **PressStart2P 6 / 7 / 10 / 14 px**: fat-on-one-side strokes, single-pixel
  artefacts hanging off diagonals — same symptom as `example-combat-screen.png`.
- **PressStart2P 8 / 16 px**: crisp, uniform-block glyphs.
- **Pizel (any size 5–14)**: crisp, uniform-block glyphs, with a much
  narrower visual footprint per glyph because Pizel is a thin proportional
  pixel font.

That cleanly confirmed H1 (PressStart2P needs integer multiples of 8) and
also confirmed we don't need to go down the BMFont (H3) path — Pizel renders
just as crisp through Phaser's TTF pipeline because its outlines actually
land on the pixel grid at single-digit sizes.

## Decision: option (b) from the story — second font face

Vendored `Pizel.ttf` (CC-0, upstream Tuxemon's `thin_font_file`) verbatim
from `upstream/mods/tuxemon/font/Pizel.ttf` and pointed `SMALL` /
`SMALL_HEADING` at it. PressStart2P stays for `BODY` / `BODY_LIGHT` /
`TITLE` / `BIG_LIGHT` / `NAME` — all of those run at 8 or 16 px and were
never affected.

### Sizing

Started at Pizel 10 px (closest visual footprint to PressStart2P 6 px's
127 px width — Pizel 10 measured 118 px). HUD names overflowed the HP bar
because Pizel 10 px's visible ink height is ~10 rows vs PressStart2P 6 px's
~7 rows.

Dropped to **Pizel 8 px** — ink height 8 rows (vs PressStart2P 6 px's 7),
which absorbs into the existing 8 px row pitch (combat HUD `infoRowH = 8`,
monster-info row spacing) with at most a 1 px clip on the bottom-most
descender. "What will Lambert do?" measures 94 logical px at Pizel 8 vs the
old 127 — well inside the 154 px combat-prompt panel.

`qa/local/measure-glyph-heights.ts` walked the raster row-by-row to get the
visible-ink height numbers above (Phaser's `t.height` reports the canvas
including line spacing, which over-reports by 2–4 px and led to the wrong
first-pass size pick).

## What landed

- `public/assets/font/Pizel.ttf` — vendored from upstream.
- `public/assets/font/ATTRIBUTIONS.md` — CC-0 / OFL attribution for both
  vendored faces.
- `public/style.css` — second `@font-face` block for Pizel with
  `font-display: block` (matches PressStart2P's "no fallback flash"
  guarantee).
- `src/game/ui/textStyle.ts`:
  - New `UI_FONT_FAMILY_THIN = "Pizel"` constant.
  - `SMALL` / `SMALL_HEADING` switched to Pizel 8 px.
  - `ensureUiFontLoaded()` now awaits both faces before the first paint.
- `qa/text-fidelity.ts` — checked-in QA covering combat prompt + HUD + tech
  menu + monster info.

## What did **not** change

- `addText()` / `applyCrispResolution()` / `refreshCrispResolution()` — the
  STORY-0211 pipeline is correct and still applies (Pizel benefits from
  `setResolution(zoom)` the same way PressStart2P does — the AA fringe at
  small sizes is the same browser-rasteriser path).
- Layout (panel sizes, row pitches, HUD positions) — Pizel 8 px slots into
  the existing budget. The 1 px descender clip on the bottom info-card row
  is purely aesthetic and within tolerance.
- BODY / TITLE / NAME — still PressStart2P 8 / 16 / 8 px, unchanged and
  verified via `qa/pixel-font-readability.ts`.

## Acceptance shots

- `combat-prompt-before.png` — repro of the symptom from
  `example-combat-screen.png`.
- `combat-prompt-after.png` — same panel, Pizel 8 px, uniform pixel blocks.
- `combat-hud-after.png` — full combat scene; HUD names crisp.
- `monster-info-after.png` — densest SMALL surface; all rows readable.
- `combat-tech-menu.png`, `font-size-sweep.png`, `font-comparison.png` —
  investigation evidence kept in the story dir for reviewer reference.

## 2026-05-21 — Reviewer findings

- Pre-commit gates: format:check, lint, tsc --noEmit, npm test all pass
- H1 confirmed via font-size sweep: PressStart2P crisp only at 8/16px; 6px produces ungridded rasterisation
- Pizel.ttf vendored from upstream (CC-0); ATTRIBUTIONS.md present alongside OFL.txt for PressStart2P
- @font-face for Pizel in public/style.css with font-display: block
- combat-prompt-before/after screenshots confirm visibly crisper rendering at same screen footprint
- combat-hud-after.png and monster-info-after.png confirm all SMALL/SMALL_HEADING surfaces updated
- qa/text-fidelity.ts runs end-to-end; qa/pixel-font-readability.ts passes (no BODY/TITLE/NAME regression)
- VERDICT: approved
