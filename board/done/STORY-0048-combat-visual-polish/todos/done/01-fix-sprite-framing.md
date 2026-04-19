# Todo: Fix Sprite Framing

## What

Change the battle sprite frame dimensions from 64x44 to 64x64 so we display the full monster sprite instead of cutting off the bottom 20 pixels.

## Why

Our sprite sheets are 128x88 pixels -- the same as upstream Tuxemon. Upstream treats them as two 64x64 regions (front at `(0,0,64,64)`, back at `(64,0,64,64)`) plus a 24px-tall strip of menu icons at the bottom. Our code currently slices them as 64x44 frames (a 2x2 grid), which cuts off the lower portion of each sprite and uses incorrect frame indices.

## Implementation

1. **Update `CombatScene.ts` sprite loading** (lines ~118-141):
   - Change `frameWidth: 64, frameHeight: 44` to `frameWidth: 64, frameHeight: 64`
   - This applies to both the rockitten loader and the loop for other monsters

2. **Update `OverworldScene.ts` sprite loading** (wherever battle sprites are preloaded):
   - Same change: `frameHeight: 44` -> `frameHeight: 64`

3. **Verify frame indices**:
   - With 64x64 frames on a 128x88 sheet, Phaser will produce frame 0 (top-left 64x64) and frame 1 (top-right 64x64)
   - The bottom 24px strip won't form a valid frame row (88-64=24 < 64), so Phaser should ignore it
   - Frame 0 = front sprite, frame 1 = back sprite (verify this matches upstream: front is left, back is right)
   - Currently we use frame 0 for player (back) and frame 1 for enemy (front) -- check if this needs swapping

4. **Adjust sprite positioning if needed**:
   - Sprites will be taller (64px vs 44px at 2x scale = 128px vs 88px), so vertical positions may need adjustment to avoid overlapping the UI box

## Verification

- Run the game and enter a battle
- Monster sprites should appear taller and fully rendered (no cut-off feet/tails)
- Compare visually against upstream Tuxemon screenshots
