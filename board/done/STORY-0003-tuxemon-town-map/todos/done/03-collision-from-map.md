# Set up collision from the map data

Determine how the exported map marks solid areas. Options:

- A dedicated "collision" layer (if the Tuxemon map has one)
- Tile properties (the Tuxemon TSX files use `enter_from` properties)
- Object layer with collision rectangles

For now, pick whichever approach is simplest for the chosen map.
The player should not be able to walk through buildings, fences, or water.
