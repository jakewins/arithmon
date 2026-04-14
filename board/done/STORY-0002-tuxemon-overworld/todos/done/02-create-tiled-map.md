# Create a small starter map as hand-crafted JSON

Hand-write a small tilemap JSON (e.g. 20x15 tiles) that follows the Tiled JSON
schema so it can be opened and edited in Tiled later. Include:

- A ground layer filled with a few grass tile variants (randomized for variety)
- A collision layer with some solid tiles (rocks, fences, etc.) to test collision
- Tileset reference pointing to a small PNG cut from Tuxemon's outdoor tilesets

No Tiled editor dependency needed for now — but since we're using Tiled's format,
we can open and edit these maps visually in Tiled whenever we want.

Place the JSON + tileset PNGs in `public/assets/maps/`.
