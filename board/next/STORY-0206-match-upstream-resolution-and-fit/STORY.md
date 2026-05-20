# STORY-0206: Match upstream 256×144 viewport + integer-FIT scaling

## Description

The game currently renders at a 4:3 320×240 logical canvas with a fixed 3× pixel zoom. Compared with upstream Tuxemon, this means:

- **Too much world is visible per screen.** Upstream is 256×144 (16:9), i.e. **16 × 9 = 144 tiles**. We're 320×240, i.e. **20 × 15 = 300 tiles** — over 2× the world area at the same per-tile size. The art isn't wrong; the viewport is.
- **Big black bars in the browser window.** `scale: { zoom: 3 }` is a fixed multiplier — the canvas is locked at 960×720 no matter how big the browser window is. Anything wider/taller letterboxes.

Reference screenshots (in `/home/jake/Pictures/Screenshots/`):

- `20260520_205022.png` — upstream Tuxemon at the bins/scoop area. Canvas fills the window; ~16 tiles wide; you can just see the fence on the right past the bins.
- `20260520_205455.png` — our clone at the same spot. Black bars on all four sides; ~20 tiles wide; whole forest visible below the player.

**No art needs resizing.** Source tiles are already 16 px and match upstream pixel-for-pixel. The fix is two settings (one Phaser config change and one logical resolution change) plus a UI-scene audit.

### What to change

#### 1. Phaser config (`src/game/main.ts:20-29`)

Replace:

```ts
width: 320,
height: 240,
scale: { zoom: 3 },
```

with upstream-matching native resolution and an integer-FIT scale mode:

```ts
width: 256,
height: 144,
scale: {
  mode: Phaser.Scale.FIT,
  autoCenter: Phaser.Scale.CENTER_BOTH,
  // Snap to whole-pixel multiples so pixel art stays crisp on
  // non-integer-multiple window sizes. Small letterbox at the edges
  // is acceptable; shimmering pixels are not.
  zoom: Phaser.Scale.Zoom.MAX_ZOOM, // or equivalent integer-snap
},
```

The right knob in Phaser 4 for "FIT but only at integer scales" may be a combination of `mode: FIT` + the `expandParent`/`autoRound` flags, or it may require a `Scale.Events.RESIZE` listener that snaps `setZoom()` to `Math.floor(...)`. Pick the cleanest approach Phaser 4 supports natively; if a small custom snap-to-integer handler is needed, add it inline in `main.ts` with a one-line comment explaining why. Verify in the browser that:

- A 1920×1080 window shows the canvas at the largest integer zoom that fits (`1920/256 = 7.5 → zoom 7`, so `256×7 = 1792` wide → ~64 px of letterbox total — acceptable).
- Resizing the window snaps to integer zooms without producing fractional-pixel rendering.
- `pixelArt: true` is preserved.

#### 2. UI-scene audit — port every screen to 256×144

Grep for hardcoded dimensions and rebuild each scene's layout for the new viewport. Affected files (from `grep -l '320\|240\|WIDTH\s*=\|HEIGHT\s*=\|SCREEN_W\|SCREEN_H' src/game/scenes/ src/game/event/ui/`):

- `src/game/scenes/CombatScene.ts:14-15` — `WIDTH=320, HEIGHT=240`
- `src/game/scenes/MathProblemScene.ts:6-7` — `WIDTH=320, HEIGHT=240`
- `src/game/scenes/MonsterInfoScene.ts:9,19-27` — explicit comment notes `tux_info.png` is 256×144 centred on our 320×240. **Bonus**: at the new resolution the BG fills the screen exactly; the centering math disappears.
- `src/game/scenes/ShopScene.ts`
- `src/game/scenes/BagScene.ts`
- `src/game/scenes/PartyScreen.ts`
- `src/game/scenes/JournalScene.ts`
- `src/game/scenes/PauseMenuScene.ts`
- `src/game/scenes/TitleScene.ts`
- `src/game/event/ui/dialogBox.ts`

For each: replace the local `WIDTH`/`HEIGHT`/`SCREEN_*` constants with **`this.scale.gameSize.width` / `…height`** (or shared constants in a new `src/game/screen.ts` if that reads cleaner), then re-evaluate any hand-tuned offsets that assumed the 4:3 4:3 viewport. Many panels were sized to fill the old canvas — shrinking the viewport by ~37% width and ~40% height means tighter padding, smaller fonts, fewer rows visible at once. Compare against upstream screenshots where available; if an upstream layout exists for a scene (combat, monster info), match it pixel-for-pixel.

**Take the porting work atomically.** Do not ship the resolution change without the UI port — it would leave every menu scene visibly broken. Sequence locally: resolution change → port one scene → run that scene's existing QA → next scene. Only land once all scenes look right.

#### 3. Reference upstream layouts where they exist

For combat and monster info specifically, upstream has authoritative reference layouts. `MonsterInfoScene` already cites `tux_info.png` (256×144) — the new resolution makes that a 1:1 blit. Look in `upstream/mods/tuxemon/gfx/ui/` for analogous backdrops for combat (`combat_bg.png` etc.) and reuse where viable.

#### 4. Update CLAUDE.md QA section

The QA snippet shows `setupGame(page)` defaults — confirm those still produce a sensible spawn at the new viewport (player should be roughly centered, not against an edge). No code change expected; just verify.

### Engine-side considerations

- The `OverworldScene` camera's `setZoom` / `centerOn` logic at line ~476 doesn't reference 320/240 directly (it uses `map.widthInPixels`), so the camera follow should keep working. Verify the player stays centered on the viewport and that the camera dead-zone (if any) still feels right at 16×9 tiles.
- Combat sprite positioning at `CombatScene.ts:1545` sets enemy texture and may have hand-tuned X/Y coordinates — verify both player and enemy sprite anchors look correct.
- Dialog box width (`event/ui/dialogBox.ts`) probably wraps text to the old width — verify with long-message dialogs that wrapping still looks right at 256 px wide. May need to reduce per-line character count.

### QA Validation

Add `qa/viewport-and-scaling.ts` (checked in). Against the running dev server:

1. **Overworld viewport check.** Use `setupGame()` to land in `spyder_paper_town` at the same tile as the reference screenshot. Take a screenshot at native resolution. Assert visible tile count: the canvas should show exactly 16 columns and 9 rows of map. Diff approximately against `20260520_205022.png` (allow palette differences; the bins area and the fence to the right should both be in view, matching the upstream framing).
2. **No black bars at common window sizes.** Run the harness at 1920×1080, 1366×768, 1280×720, and 1024×600 window sizes. Screenshot each. Assert the canvas takes >95% of the smaller dimension (some letterbox is fine for aspect mismatches; large bars are not). Verify integer-scale snap (capture the canvas client dimensions via debug bridge; both should be `256·N` and `144·N` for some integer N).
3. **UI scenes render correctly.** Open every UI scene (CombatScene, MathProblemScene, MonsterInfoScene, ShopScene, BagScene, PartyScreen, JournalScene, PauseMenuScene, TitleScene) and screenshot each. No text should clip outside the viewport. No menu options should be unreachable. Reference the screenshots in `JOURNAL.md`.
4. **Dialog wrap.** Trigger a long-message dialog (pick one from the .po file that's clearly multi-line) and verify text wraps within the new canvas width.

The implementing agent **MUST verify points 1–4 visually in a real browser** and capture the screenshots before flipping to `reviewing/`. Reviewers will diff the overworld screenshot against upstream.

### Out of scope

- Changing tile size (still 16 px — that's an upstream constant).
- Resizing or re-exporting any tile/sprite art.
- Replacing pixel-art assets with hi-res versions.
- Adjusting `OverworldScene`'s camera zoom (the camera follows in world-space; the viewport size change is sufficient).

## Acceptance Criteria

- [ ] `src/game/main.ts` config is `width: 256, height: 144` with an integer-snap FIT scale mode (canvas grows to fill window at whole-pixel zoom)
- [ ] No scene file contains hardcoded `320`/`240`/`SCREEN_W=320`/`SCREEN_H=240`; all use `this.scale.gameSize.*` or a shared module constant set to 256×144
- [ ] Every UI scene (Combat, MathProblem, MonsterInfo, Shop, Bag, PartyScreen, Journal, PauseMenu, Title) and the shared `DialogBox` is re-laid-out for 256×144 and visually verified in the browser
- [ ] Overworld viewport shows ~16×9 tiles, matching upstream framing in `20260520_205022.png`
- [ ] `qa/viewport-and-scaling.ts` exists, is checked in, runs end-to-end, and produces screenshots at multiple window sizes + screenshots of every UI scene; referenced in `JOURNAL.md`
- [ ] `npm run format:check && npm run lint && npx tsc --noEmit && npm test` all pass
