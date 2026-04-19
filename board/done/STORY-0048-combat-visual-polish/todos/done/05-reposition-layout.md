# Todo: Reposition Layout to Match Upstream

## What

Adjust the positions of all combat elements (sprites, platforms, HUD panels) to match the upstream Tuxemon proportions.

## Why

Even with the right assets, the layout needs to match upstream's spatial arrangement. Tuxemon places the enemy in the upper-right on an elevated island with its HUD panel above-left, and the player in the lower-left on a lower island with its HUD panel below-right.

## Reference

Upstream combat_layouts.yaml:
- `LEFT_COMBAT.home`: `[0, 62, 96, 70]` -- player monster area (x=0, y=62, w=96, h=70)
- `RIGHT_COMBAT.home`: `[140, 18, 96, 70]` -- enemy monster area (x=140, y=18, w=96, h=70)
- These are in upstream's 256-wide coordinate space

Our canvas is 320x240 (vs upstream's ~256x~170 visible area above dialog).

## Implementation

1. **Map upstream coordinates to our canvas**:
   - Scale factor: 320/256 = 1.25x horizontally
   - Vertical: our BOX_Y is 176 (240-64), upstream dialog starts around y=108
   - Player area: roughly x=0-120, y=80-170 in our coords
   - Enemy area: roughly x=175-295, y=22-92 in our coords

2. **Position islands**:
   - Back island (enemy): center around (230, 55) in our coords
   - Front island (player): center around (80, 145) in our coords
   - Fine-tune so they look proportionally correct

3. **Position monster sprites relative to islands**:
   - Monster bottom edge should align with island top + small offset
   - Use `setOrigin(0.5, 1)` for bottom-center anchoring

4. **Position HUD panels**:
   - Enemy HUD: upper-left quadrant (matching upstream's left-side placement for opponent info)
   - Player HUD: right side, below enemy area (matching upstream's right-side placement for player info)

5. **Adjust the UI box** (dialog/menu area) if needed for the new proportions

## Verification

- The overall spatial arrangement should closely match the upstream Tuxemon screenshots
- Enemy elevated upper-right, player lower-left, HUDs in their correct corners
- No elements overlapping incorrectly
