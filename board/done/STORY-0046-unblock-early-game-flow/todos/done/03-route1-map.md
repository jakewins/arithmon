# Todo: Route 1 Map

## What

Create the Route 1 map — the first outdoor route connecting Paper Town (south) to Cotton Town (north). This is a grass route with open areas for wild encounters.

## Why

Route 1 is the critical link between the starting area and the first major hub town. Without it, the player is stuck in Paper Town with nothing to do after getting their starter.

## Tuxemon Reference

Check `mods/tuxemon/maps/spyder_route1.tmx` for the canonical map layout:

- **Size**: 40x32 tiles (640x512 pixels at 16px/tile)
- **Tilesets**: core_outdoor, core_outdoor_nature, core_outdoor_water, core_buildings, core_set_pieces
- **Layers**: Ground, Collisions, Above Player (standard layer structure)
- **Map connections**:
  - South edge → Paper Town (tiles around x=13-14, y=31)
  - North edge → Cotton Town (tiles around x=21-27, y=0)
  - East edge → Brideswood (future, not needed now)
  - West edge → Sea Route C (future, not needed now)
- **Grass zones**: several patches of tall grass scattered across the route for encounters
- **Collision objects**: fences, trees, water blocking passage to create a path

Export or recreate the Route 1 map in Tiled, matching the Tuxemon layout as closely as possible. Use our existing tilesets (`core_outdoor`, `core_outdoor_nature`, `core_outdoor_water`, `core_buildings`, `core_set_pieces`).

## Implementation

1. **Create the map in Tiled**:
   - Open `mods/tuxemon/maps/spyder_route1.tmx` in Tiled as reference
   - Create `spyder_route1.json` (export as Tiled JSON) with matching dimensions and layout
   - Use our existing tilesets — check `src/game/data/maps.ts` for available tileset constants
   - Include Ground, Collisions, and Above Player layers
   - Mark grass tile areas (these will trigger wild encounters)

2. **Register the map** in `src/game/data/maps.ts`:
   - Add `spyder_route1` entry to `MAP_REGISTRY`
   - Include the correct tilesets (likely `CORE_OUTDOOR`, `CORE_OUTDOOR_NATURE`, `CORE_OUTDOOR_WATER`, `CORE_BUILDINGS`, `CORE_SET_PIECES`)

3. **Add any missing tileset images** to `public/assets/maps/` if Route 1 uses tilesets we don't have yet.

4. **Save the map** to `public/assets/maps/spyder_route1.json`.

## Verify with Puppeteer

Use `/puppeteer` to:
1. Teleport to the new map via debug API: `A.teleport("spyder_route1.tmx", 20, 16)`
2. Screenshot the map to verify it renders correctly
3. Walk around to verify collisions work (fences, trees, water block passage)
4. Verify the map doesn't crash or have rendering glitches

## Done When

- `spyder_route1.json` exists in `public/assets/maps/`
- Map is registered in `MAP_REGISTRY`
- Map renders correctly with proper collisions
- Map has grass areas for future encounter zones
- Layout broadly matches Tuxemon's Route 1
