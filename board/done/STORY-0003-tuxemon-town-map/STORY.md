# STORY-0003: tuxemon-town-map

## Description

Replace our generated grass map with a real Tuxemon town map. Use the Tiled CLI
to export a TMX map to JSON with embedded tilesets, load it in Phaser, and walk
around it as a "dumb picture" — visual-only, no interactivity beyond movement and
basic collision.

This proves we can render full authored maps from Tuxemon and sets us up to add
interactive elements (doors, NPCs, encounters) incrementally.

## Notes

- Tiled CLI: `tiled --export-map --embed-tilesets input.tmx output.json`
- Good starter map candidates: Cotton Town, Timber Town (small towns)
- Maps may reference multiple tilesets — OverworldScene needs to handle that
- Some layers should render above the player (rooftops, tree canopy) — set layer depth
- Collision: either use a dedicated collision layer or mark solid tiles by property
- Don't need doors, NPCs, warps, or encounters yet — just walking around the visual map

## Acceptance Criteria

- [ ] Tiled CLI is used to export a Tuxemon town map to JSON
- [ ] The map renders fully in the browser (all tile layers, multiple tilesets)
- [ ] Player can walk around the map with the existing movement system
- [ ] Layers render in correct Z-order (player behind rooftops/trees)
- [ ] Basic collision prevents walking through buildings/walls
- [ ] Camera follows player and clamps to map bounds
