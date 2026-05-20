# STORY-0209 Journal

## Implementation

Dropped the map-size branch in `OverworldScene.create()`. The camera now
always calls `cam.startFollow(player, true)` and `cam.setBounds(0, 0,
mapW, mapH)`, matching upstream Tuxemon's `camera.py:208-217` ("always
follow, no special-case for small rooms"). Phaser's bounds clamp handles
all three map categories:

- **Bigger-than-viewport** maps: unchanged — scroll with the player,
  clamp at the edges (verified against `spyder_paper_town` near the
  east edge; camera scroll pinned at `mapW - viewportW = 384` px).
- **Narrower-but-taller** maps (cafe, scoop, artshop has both axes):
  Phaser anchors the smaller axis at scroll = 0 and scrolls the other.
  The off-map area shows the camera's background colour (already
  `0x000000`, line 482 — kept as-is per the story's "is black what we
  want?" check).
- **Both-smaller** maps (bedroom, house1): scroll stays at 0 in both
  axes; the entire map is visible; the player is always on screen
  because they can't physically walk further than the map's edges
  (which fit in the viewport).

No exception was needed for the both-smaller case — Phaser's default
clamp behaviour is fine.

Camera state (`scrollX`, `scrollY`, `width`, `height`) is now exposed via
`OverworldScene.getDebugState()` so the QA harness can assert the player
is in-viewport without reaching into Phaser internals.

## QA

`qa/indoor-camera-follow.ts` (checked in). Boots once on
`spyder_paper_town`, then teleports between maps. For each map, walks
to extreme reachable tiles and asserts the player tile sits inside the
camera viewport, screenshotting at every stop.

Screenshots produced (in `qa/screenshots/`):

- `indoor-cam-cafe-entry.png` — south door framing; compare with
  `~/Pictures/Screenshots/20260520_221427.png` (upstream reference).
  Player visible on the entry rug at the bottom; upper half shows
  tables, chairs, NPCs. Black bar to the right since cafe is 192 wide
  vs viewport 256.
- `indoor-cam-cafe-nw.png`, `…-cafe-ne.png` — NW/NE corners.
- `indoor-cam-bedroom-{nw,ne,sw,se}.png` — bedroom both-smaller; map
  fits entirely in viewport with black filling right/bottom.
- `indoor-cam-house1-{nw,ne,se,sw}.png` — same pattern; SE/SW reached
  via row 6 to avoid the south-door teleport facing-down trigger.
- `indoor-cam-scoop-{spawn,nw,ne,se,sw}.png` — scoop narrower+taller.
- `indoor-cam-artshop-{spawn,nw,ne,se,sw}.png` — artshop wider+taller.
- `indoor-cam-paper-town-edge.png` — outdoor regression near east edge;
  camera clamps, no void past map boundary.

Reviewer should diff `indoor-cam-cafe-entry.png` against
`~/Pictures/Screenshots/20260520_221427.png` and confirm the framing
matches (player visible on the rug at the bottom of the visible map
area, cafe interior filling the upper portion).

### QA mechanical notes

Many interior maps have south-door teleport tiles that fire on
`char_at && char_facing player,down`. The QA script controls the order
of walks and uses intermediate waypoints so the player's facing never
combines with those trigger tiles. This is brittle-feeling but follows
straight from how the engine's event system works — the alternative
(disabling the events at QA time) would mask the trigger from being
exercised at all.

## 2026-05-20 — Reviewer findings (Approved)

- Code change: `OverworldScene.create()` camera block reduced from 8 lines
  with an if/else to 2 unconditional lines (`startFollow` + `setBounds`).
  Stale comment removed. Clean, minimal, matches upstream
  `camera.py:208-217` intent exactly.
- `getDebugState()` camera extension is cheap and correctly scoped —
  four plain numbers added to the existing state blob; no Phaser internals
  leak out.
- Pre-commit gates re-run: `format:check / lint / tsc --noEmit / npm test`
  all pass (42 test files, 465 tests).
- Ran `qa/indoor-camera-follow.ts` against port 8082; all assertions passed:
  - Cafe (192×192, narrower+taller): player on-screen at entry (8,10), NW
    (0,6), NE (11,4). Camera scroll confirmed correct.
  - Bedroom (144×112, both-smaller): player on-screen at all four corners
    (NW/NE/SW/SE). Map fills ~56 % of viewport; black padding right+bottom.
  - House1 (160×128, both-smaller): all four corners reached without
    triggering the south-door teleport; player on-screen throughout.
  - Scoop (208×176, narrower+taller): all four corners, player on-screen.
  - Artshop (352×176, wider+taller): all four corners including the tricky
    SW approach past the west-wall corridor; player on-screen.
  - Paper town edge regression: `scrollX=384.0` (exactly `640-256`) —
    camera clamped, no void past east map boundary.
- Visual review of `indoor-cam-cafe-entry.png` vs upstream reference
  `~/Pictures/Screenshots/20260520_221427.png`: framing matches — player
  sprite visible on the entry rug at the bottom, cafe interior (tables,
  chairs, NPCs) filling the upper portion; black bar on the right is
  expected (our 256 px viewport is narrower than upstream's wider one).
- `qa/indoor-camera-follow.ts` is 281 lines, checked in, covers all five
  map categories from the story table plus the outdoor regression case.
