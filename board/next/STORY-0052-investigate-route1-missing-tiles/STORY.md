# STORY-0052: investigate-route1-missing-tiles

## Description

On `spyder_route1`, there's a vertical strip of tiles at x=20-21, y=3-9 that render as black squares with a green diagonal line — Phaser's "missing frame" placeholder. These tiles should show cliff/ledge artwork from the `core_outdoor` tileset.

### What we know

The map data at that position uses two tile IDs across two layers:

- **Layer 2**: tile 2648 (core_outdoor local ID 1097, row 29 col 24 in the tileset grid)
- **Layer 3**: tile 2611 (core_outdoor local ID 1060, row 28 col 24 in the tileset grid)

The `core_outdoor.png` tileset image **does have valid pixel data** at those positions — green cliff/ledge artwork with partial transparency. The tileset metadata checks out: `tilecount=2775`, `columns=37`, image is 592×1200px (37×75 tiles at 16px). Both local IDs (1060, 1097) are well within range. No flip flags are set on the tile data. Tile 1097 has `enter_from`/`exit_from` properties but no animation. Tile 1060 has no special properties.

Despite all of this, Phaser renders them as the "missing frame" fallback. Something about these specific tiles is different from the thousands of tiles that render correctly. The surrounding tiles (2797 = tall grass, 1737/1738 = fences, 2796, 3329) all render fine.

### How to investigate

This needs an incremental, scientific approach. Use the puppeteer to teleport to `spyder_route1` at tile (20, 7) and take screenshots to verify each hypothesis. The black squares are immediately visible in the center-right area of the map.

Suggested lines of inquiry (work through these one at a time, verifying with screenshots):

1. **Isolate the variable**: Pick one broken tile (e.g. 2648) and one working neighbor tile. What's different? Compare their local IDs, their tileset grid positions, their properties, and the pixel data at their tileset positions.

2. **Test tile replacement**: In the map JSON, temporarily swap one broken tile for a known-working tile (e.g. replace 2648 with 2797). Does the position render correctly? This confirms the issue is tile-specific, not position-specific.

3. **Test the tile elsewhere**: Place tile 2648 at a position that currently works (e.g. where 2797 is). Does it break there too? This confirms it follows the tile ID, not the map position.

4. **Check Phaser's tile frame registry**: Add debug logging in `OverworldScene.create()` after `map.addTilesetImage()` to inspect how many frames Phaser registered for the core_outdoor tileset. Check if tiles 1060/1097 are in the frame list. Phaser's `Tileset.getTileData()` or similar API may reveal whether these specific tiles have frames.

5. **Check tileset image dimensions**: Phaser might compute the number of tile rows/columns differently than Tiled. If Phaser calculates fewer rows than 75 (e.g., due to rounding or a margin/spacing mismatch), tiles in higher rows might fall outside Phaser's frame range.

6. **Check for alpha/transparency issues**: The tiles at those positions are partially transparent (tree canopy over cliff). Test if fully opaque tiles at the same tileset grid positions would render.

7. **Check other maps**: Do any other maps use these same tile IDs? Do they also show the black square?

### Reproduction

```ts
// In a puppeteer QA script:
await page.evaluate(() => window.A!.teleport("spyder_route1", 20, 7));
await new Promise(r => setTimeout(r, 3000));
await screenshot(page, "route1-missing-tiles");
// The black squares should be visible near the player
```

## Acceptance Criteria

- [ ] Root cause identified and documented
- [ ] The tiles at x=20-21, y=3-9 on spyder_route1 render correctly (verified via puppeteer screenshot)
- [ ] Fix doesn't break rendering on any other map (spot-check a few via puppeteer)
