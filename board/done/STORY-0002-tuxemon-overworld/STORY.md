# STORY-0002: tuxemon-overworld

## Description

Render a minimal Tuxemon-style overworld: a Tiled map with grass/terrain, a player
character that walks around with arrow keys, and a camera that follows them. Uses
Tuxemon's CC-BY-SA assets (tilesets + player spritesheet) loaded into Phaser.

This is the first step toward actual gameplay — proving we can render a tile-based
world with an animated character.

## Asset details

- **Maps**: Tuxemon uses Tiled `.tmx` (XML) format. Phaser needs JSON, so we export
  from Tiled as JSON. A good starter map is `eclipse_routef.tmx` (40x20 tiles), or
  we can make our own tiny map.
- **Tilesets**: 16x16 pixel tiles. Key files: `core_outdoor.png` / `.tsx` and
  `core_outdoor_nature.png` / `.tsx`.
- **Player sprite**: `adventurer.png` — 48x128px spritesheet, 16x32 frames,
  4 rows (down/left/right/up) x 3 cols (walk1/idle/walk2).
- **License**: CC-BY-SA 4.0. We must include attribution.

## References

- Tuxemon assets: https://github.com/Tuxemon/Tuxemon/tree/development/mods/tuxemon
- Phaser tilemap docs: https://docs.phaser.io/api-documentation/class/tilemaps-tilemap
- Tiled map editor: https://www.mapeditor.org/

## Acceptance Criteria

- [ ] A Tiled map with grass tiles renders in the browser
- [ ] A player character sprite is visible on the map
- [ ] Arrow keys move the character with walking animation (4 directions)
- [ ] Camera follows the player
- [ ] Basic tile collision (player can't walk off the map / through solid tiles)
- [ ] Tuxemon asset attribution is included in the repo
