# Todo: Add Battle Backgrounds

## What

Replace the solid dark teal background (`#2a4a3a`) with illustrated background images from upstream Tuxemon.

## Why

Upstream Tuxemon has richly illustrated 256x108 battle backgrounds (grass, forest, cave, beach, etc.) that give each battle a sense of place. Our flat color looks empty and unfinished.

## Implementation

1. **Copy background images from upstream**:
   - Source: `Tuxemon/mods/tuxemon/gfx/ui/combat/*_background.png`
   - Destination: `public/assets/ui/combat/`
   - Start with `grass_background.png` as the default
   - Also copy: `forest_background.png`, `cave_background.png`, `beach_background.png` (for future environment support)
   - All are 256x108 pixels

2. **Load the background in `CombatScene.preload()`**:
   - Add `this.load.image("battle-bg-grass", "assets/ui/combat/grass_background.png")`

3. **Render the background in `CombatScene.create()`**:
   - Replace `this.cameras.main.setBackgroundColor("#2a4a3a")` with a background image
   - Our canvas is 320x240; the background is 256x108
   - Scale to fill the width (320/256 = 1.25x) and position at the top
   - The bottom portion (below the background) is where the UI box sits, so it can remain a solid color or be covered by the dialog border
   - Set depth to -1 so everything else renders on top

4. **Handle the aspect ratio**:
   - Upstream scales the background to fill the width and stretches the last pixel row downward to fill any gap
   - Simpler approach: scale to fill width, let the UI box area at the bottom be the dialog panel color

## Verification

- Battle scene should show a grassy landscape behind the monsters instead of flat teal
- Compare against upstream Tuxemon screenshots (ex1.png, ex2.png)
