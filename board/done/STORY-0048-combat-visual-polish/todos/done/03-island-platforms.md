# Todo: Add Island Platforms

## What

Add the grassy island/mound platforms that monsters stand on during battle, matching the upstream Tuxemon look.

## Why

In upstream Tuxemon, each combatant stands on a small grassy island platform. The enemy's platform is in the upper-right area, and the player's is in the lower-left. Without these, our monsters float awkwardly in space.

## Reference

- Island sheets: `Tuxemon/mods/tuxemon/gfx/ui/island_sheet/*_island_sheet.png`
- Each sheet is 192x57 pixels = two 96x57 frames side by side
- Left frame (0) = back/opponent island (upper-right in scene)
- Right frame (1) = front/player island (lower-left in scene)
- The grass environment uses `grass_island_sheet.png`

## Implementation

1. **Copy island sheet assets from upstream**:
   - Source: `Tuxemon/mods/tuxemon/gfx/ui/island_sheet/grass_island_sheet.png`
   - Destination: `public/assets/ui/combat/grass_island_sheet.png`
   - Also copy `woodland_island_sheet.png`, `cave_island_sheet.png` for future use

2. **Load the island sheet in `CombatScene.preload()`**:
   - `this.load.spritesheet("island-grass", "assets/ui/combat/grass_island_sheet.png", { frameWidth: 96, frameHeight: 57 })`

3. **Render platforms in `CombatScene.create()`**:
   - Add back island (opponent side) at upper-right, using frame 0
   - Add front island (player side) at lower-left, using frame 1
   - Set depth below monster sprites but above background
   - Scale as needed (upstream uses 1x at 256-wide resolution; we're at 320 so ~1.25x may work, or keep 1x for pixel-perfect look)

4. **Anchor monster sprites to platform tops**:
   - Position monster sprites so their bottom edge sits at the top of their respective island platform
   - Upstream anchors monsters to `island_rect.bottom - monster_base_offset` (offset ~24px for wild, ~12px for trainers)

## Verification

- Both monsters should visually stand on grassy mounds
- The enemy island should be in the upper-right quadrant, player island in lower-left
- Compare against upstream screenshots
