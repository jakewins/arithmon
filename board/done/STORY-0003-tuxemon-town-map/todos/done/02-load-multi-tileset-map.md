# Update OverworldScene to handle multiple tilesets and layers

The exported map will likely have multiple tilesets and several tile layers.
Update OverworldScene to:

- Dynamically load all tileset images referenced in the map JSON
- Call `addTilesetImage` for each tileset
- Create all tile layers, passing all tilesets to each layer
- Set appropriate depth on layers so "above player" layers (rooftops,
  tree canopy) render on top
