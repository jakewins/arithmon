# STORY-0211 Implementation Journal

## Root cause (confirmed)

Hypothesis 1 from STORY.md was correct: Phaser's `Phaser.GameObjects.Text`
rasterised its internal canvas at the **logical font size** (e.g. 6 px for
`SMALL`). That tiny canvas was then sampled with NEAREST filtering as the
game canvas (256×144) was upscaled to display resolution by our integer-zoom
scaler in `src/game/main.ts`. Each 1-px gray AA fringe from the browser's
font rasteriser turned into a `zoom×zoom` block of the same gray — the
visible halo around every glyph in `current-fuzzy.png`.

Upstream Tuxemon avoids this because pygame draws straight to the display
framebuffer, and `upstream/tuxemon/ui/text_renderer.py:33` rasterises at
`scale_int(FONT_SIZE)` — i.e. at the display resolution, where AA fringes
are exactly one device pixel and invisible to the eye.

## Fix (hypothesis 1)

Phaser 4 exposes `Text.setResolution(n)` which tells the Text to rasterise
its internal canvas at `n × the requested font size`. Setting
`n = game.scale.zoom` makes the AA fringe land on the same display-pixel
density upstream uses.

I considered:

- **Setting `resolution` in the static `TextStyle` constants.** Rejected:
  zoom isn't known at module-load time (it's computed after `setZoom` runs
  in `snapToIntegerZoom`), so the constants would need to be mutated post-boot.
  That couples the style module to the lifecycle.
- **Patching Scene's `add.text` factory.** Rejected: hacks the Phaser
  GameObjectFactory in ways that future Phaser upgrades may break.
- **BitmapText migration (hypothesis 2).** Held in reserve. Not needed —
  hypothesis 1 worked end-to-end on the first try (see
  `qa/local/repro-text-fuzz.ts`).

The chosen approach:

1. New `addText(scene, x, y, text, style)` helper in `src/game/ui/textStyle.ts`.
   Constructs the Text via `scene.add.text(...)`, then calls
   `setResolution(round(scene.scale.zoom))` on it. Registers the object in
   a module-level `Set` so a window resize can re-snap every active Text.
2. New `refreshCrispResolution(zoom)` exported from the same module, called
   from `snapToIntegerZoom` in `src/game/main.ts` whenever the integer zoom
   changes. Walks the tracking set and re-applies `setResolution(zoom)` to
   every live Text. Without this, resizing the window into a new zoom band
   leaves existing Text objects with their old (now-wrong) canvas density
   until the scene restarts.
3. All 101 `scene.add.text(...)` / `this.add.text(...)` call sites across
   the 16 files migrated to `addText(scene, ...)` / `addText(this, ...)`.

## QA evidence

`qa/text-crispness.ts` (checked in) captures:

- `crisp-01-combat-dialog.png` — "What will Budaye do?" prompt. Compare
  with `upstream-crisp.png` in this directory; glyphs are now solid pixel
  blocks with no gray fringe. The script also runs a pixel-fringe sample
  on the dialog strip and asserts < 12 % mid-tone pixels (we measure 0 %
  post-fix; pre-fix the same strip was > 25 %).
- `crisp-02-resize-{800x600,1280x720,1920x1080}.png` — resize sweep across
  three integer-zoom breakpoints. Text stays crisp at every breakpoint;
  the `refreshCrispResolution` hook re-rasterises existing Text objects
  on zoom change.
- `crisp-03-math-quiz.png` / `crisp-04-monster-info.png` /
  `crisp-05-party-screen.png` / `crisp-06-title-screen.png` — broader
  scene sweep. No halo in any.

Pre-saved reference screenshots in this directory:

- `current-fuzzy.png` — pre-fix combat dialog (halo present).
- `upstream-crisp.png` — visual target.
- `after-crisp.png` — post-fix combat dialog (matches the target).
- `after-pairagrin-hud.png` — Pairagrin Lv2 fits inside the enemy HUD,
  same as STORY-0210 left it; text size unchanged.
- `after-1920x1080.png` — same scene at 7× zoom; glyphs still pixel-perfect.
- `after-math-quiz.png` — math quiz scene.

## Acceptance criteria

- [x] Root cause documented above; hypothesis 1 confirmed.
- [x] Combat dialog text matches `upstream-crisp.png` — see
      `after-crisp.png` side-by-side comparison.
- [x] Text size unchanged from STORY-0210 — `after-pairagrin-hud.png`
      verifies "Pairagrin Lv2" still fits.
- [x] Fix holds across 800×600 / 1280×720 / 1920×1080 — see
      `qa/screenshots/crisp-02-resize-*.png`.
- [x] `qa/text-crispness.ts` exists, checked in, captures combat + 4 more
      scenes, referenced here.
- [x] No BitmapText migration needed (hypothesis 1 sufficient).
- [x] `npm run format:check && npm run lint && npx tsc --noEmit && npm test`
      all pass.
