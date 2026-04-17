# STORY-0016: Fix Camera for Small Maps

## Problem

When the player enters a map smaller than the 320×240 viewport (e.g. `spyder_bedroom` at 144×112 pixels), the camera follows the player and scrolls the entire room, exposing black void around the edges. The expected behavior is for the room to stay fixed in the centre of the screen and the player sprite to move within it.

## Root Cause

In `OverworldScene.create()`, `cameras.main.startFollow()` is called unconditionally. For large maps, `setBounds()` constrains the camera to the map edges — the player appears centred and the map scrolls naturally. For small maps, `setBounds()` is skipped (the map is smaller than the viewport in both dimensions), so the camera follows the player freely with no constraint, dragging the tiny map around.

### Relevant dimensions

| Surface | Width (px) | Height (px) |
|---------|-----------|-------------|
| Viewport | 320 | 240 |
| cotton_town | 592 | 640 |
| player_house_bedroom | 144 | 112 |
| spyder_bedroom | 144 | 112 |
| water_end_of_desert | 800 | 640 |

## Proposed Fix

For maps that are smaller than the viewport in **either** dimension, skip `startFollow()` entirely and instead centre the camera on the map:

```ts
if (map.widthInPixels >= cam.width && map.heightInPixels >= cam.height) {
  this.cameras.main.startFollow(this.player, true);
  cam.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
} else {
  // Small map — lock camera to map centre so the room stays fixed on screen
  cam.centerOn(map.widthInPixels / 2, map.heightInPixels / 2);
}
```

The player sprite still moves via physics — only the camera changes. No gameplay logic is affected.

## Acceptance Criteria

- [ ] On small maps (both indoor bedrooms), the map stays centred and the player moves within it
- [ ] On large maps (cotton_town, water_end_of_desert), the camera follows the player as before
- [ ] All existing tests pass

## Proposed TODO Breakdown

1. Move `startFollow` inside the large-map branch and add `cam.centerOn()` for the small-map branch
2. Manual browser test on spyder_bedroom and cotton_town
