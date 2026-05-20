# STORY-0209: Make the camera follow the player indoors, like upstream

## Description

When entering interior maps that are smaller than the viewport, our camera locks to the map centre instead of following the player. After the 256×144 resolution change in STORY-0206, this surfaces as a visible bug — the player can walk off-screen entirely.

### Reference

- `~/Pictures/Screenshots/20260520_221427.png` — upstream entering Cotton Town cafe. Camera follows the player; the player is visible at the bottom on the entry rug; the upper half of the cafe shows tables and chairs above the player.
- `~/Pictures/Screenshots/20260520_221449.png` — our clone in the same spot. Camera is locked to the map centre; the player is off-screen below; only the upper half of the cafe is visible.

### Where the bug lives

`src/game/scenes/OverworldScene.ts:469-477` (introduced by commit `8db4937` / STORY-0016 on 2026-04-17):

```ts
const cam = this.cameras.main;
if (map.widthInPixels >= cam.width && map.heightInPixels >= cam.height) {
  cam.startFollow(this.player, true);
  cam.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
} else {
  // Small map — lock camera to map centre so the room stays fixed on screen
  cam.centerOn(map.widthInPixels / 2, map.heightInPixels / 2);
}
```

The original commit reasoned that small interior rooms should stay anchored on screen rather than scroll. That made sense at the old 320×240 viewport, where most interior maps fit entirely in view. At 256×144 the assumption no longer holds: maps like the cafe (192×192) are now taller than the viewport, so the centred camera cuts off the lower half — exactly where the player spawns.

### What upstream does

Upstream Tuxemon's camera unconditionally follows the player, with no map-size special-casing.

- `upstream/tuxemon/camera/camera.py:208-217` — the per-frame update reads the entity position and centres the view on it. No clamping, no fit-check, no indoor-vs-outdoor branch.
- `upstream/tuxemon/camera/camera.py:157-189` — `CameraView` is just a position + viewport size. No bounds.

So upstream's behaviour is: **always follow the player, ignore map size**. The cafe screenshot makes sense because the camera is centred on the player at the south edge; the empty area at the bottom of the visible viewport (which would be off-map) just gets the renderer's clear colour.

### Map-size spectrum in our project

`grep` of `public/assets/maps/*.json` shows three categories. The fix needs to handle all of them:

| Map | Tile dims | Pixel dims | Vs 256×144 viewport |
|---|---|---|---|
| `spyder_bedroom` | 9×7 | 144×112 | smaller in **both** dimensions |
| `spyder_cotton_house1` | 10×8 | 160×128 | smaller in both |
| `spyder_cotton_cafe` | 12×12 | 192×192 | narrower **but** taller than viewport |
| `spyder_paper_scoop` | 13×11 | 208×176 | narrower but taller |
| `spyder_cotton_artshop` | 22×11 | 352×176 | wider **and** taller |

Currently:
- Maps in row 4 (both bigger) work — follow + bounds.
- Maps in rows 1–3 hit the `centerOn` branch and break in various ways depending on which dimension is smaller than the viewport.

### What to build

1. **Drop the special case.** Always call `cam.startFollow(this.player, true)` and `cam.setBounds(0, 0, map.widthInPixels, map.heightInPixels)`. That matches upstream's "always follow" semantics, and Phaser's bounds clamp will handle the edges sensibly for all three map categories. Verify in the browser:
   - **Bigger-than-viewport maps:** camera scrolls with the player, clamps at edges (no void shown past map boundary). No regression from current behaviour.
   - **Smaller-than-viewport in one dimension** (e.g. cafe — narrower than 256, taller than 144): camera scrolls vertically following the player; horizontally Phaser will anchor the map to whichever edge the clamp pins, so the map sits flush against one side of the viewport with the off-map colour filling the rest. Confirm this looks right; if Phaser's default clamp picks a weird side, override `cam.setScroll` after a small map is loaded to anchor consistently.
   - **Smaller-than-viewport in both** (e.g. bedroom, house1): camera can't scroll at all; the whole map shows pinned to whichever corner Phaser picks. Verify the player is still visible regardless of where they walk inside the map. This is the trickiest case — if Phaser doesn't behave well, the implementer may need a tiny manual handler (centre the camera on the map if both dims are smaller, otherwise follow). That's still much simpler than the current code and only kicks in for the both-smaller case.
2. **Background colour.** Confirm `cam.setBackgroundColor(0x000000)` at line 482 is what we want for off-map area visible past map edges. Upstream uses black in the equivalent case. If not, change it.
3. **No code in event YAMLs needs to change.** This is purely an engine layer fix.
4. **Delete the stale comment** at `OverworldScene.ts:475` (`Small map — lock camera to map centre…`) since the special case is gone.

### Hypothesis to verify (don't trust without checking)

A clean reading of upstream suggests there's no bounds clamping at all — the camera will happily show void past the edge of any map. Our outdoor maps may be relying on `setBounds` to hide that, but the user-facing effect is identical: in upstream you never see past a map edge because the map is large enough that the player triggers a transition before reaching the edge. We should keep `setBounds` for the same reason (it's a free safety net), unless the implementer finds it's actively wrong for one of the small-map cases.

### QA Validation

`qa/indoor-camera-follow.ts` (checked in). Against the running dev server:

1. **Cotton cafe (primary).** Use `setupGame()` to land in Cotton Town. Walk the player into the cafe from the south door. Screenshot. Diff visually against `20260520_221427.png` — the framing should match: player visible on the entry rug at the bottom; upper half of the cafe (counter, tables, NPCs) above. Reference the screenshot path in `JOURNAL.md`.
2. **Move the player around the cafe.** Walk to the northwest corner. Screenshot. Walk to the southeast corner. Screenshot. The camera should follow in both cases; the player should remain visible in every screenshot.
3. **Small both-dimensions map (`spyder_bedroom` or `spyder_cotton_house1`).** Enter the map, walk to each of the four corners, screenshot each. Player must remain visible. Map should not visibly jump or jitter as the player crosses any of its own internal boundaries.
4. **Big map regression (`spyder_paper_town` or `spyder_cotton_town`).** Walk near the map's geographic edge and screenshot. The camera should still clamp at the edge (no void revealed past the map boundary), matching pre-fix behaviour.

The implementing agent **MUST verify all four cases by screenshot in a real browser before flipping to `reviewing/`**. The fix is a small code change; the risk is purely behavioural across the three map categories.

### Out of scope

- Smooth camera transitions or any camera-effects work (upstream has `move_smoothly_to` and `unfollow`; we have neither and don't need them for this story).
- Restyling the off-map background colour beyond confirming black is what we want.
- Any tweaks to the player spawn tile per map. The fix is about how the camera reacts to the player, not where the player starts.

## Acceptance Criteria

- [ ] `src/game/scenes/OverworldScene.ts:469-477` no longer branches on map size; camera always follows the player with bounds set to the map dimensions (unless the implementer documents a single narrow exception in `JOURNAL.md` for the both-smaller case)
- [ ] Cotton cafe entrance framing matches upstream's `20260520_221427.png` — player visible on the rug at the bottom of the viewport
- [ ] Player remains visible at every position inside every interior map in the listed table (cafe, bedroom, house1, scoop, artshop)
- [ ] Outdoor maps still clamp at edges (no visible void past map boundary)
- [ ] `qa/indoor-camera-follow.ts` exists, is checked in, runs end-to-end, and captures all four screenshot sets; referenced in `JOURNAL.md`
- [ ] `npm run format:check && npm run lint && npx tsc --noEmit && npm test` all pass
