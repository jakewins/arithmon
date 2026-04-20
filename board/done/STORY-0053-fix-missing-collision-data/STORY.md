# STORY-0053: fix-missing-collision-data

## Description

The player can walk through many things that should block movement: fences, water, cliff walls, and some trees. Some objects DO block correctly (certain trees, NPC collision bodies), so the collision system partially works. Something is missing in how tile collision data is loaded or applied.

### Symptoms

- **Paper Town (starter town)**: player can walk over water, walk through fences (e.g. around the daycare)
- **Route 1 (spyder_route1)**: player can walk through cliff walls, walk over some trees
- Some trees and NPCs DO block, so the physics/collision system itself works

### Likely causes

Tiled maps define collision properties per tile (e.g. custom properties like `blocked` or collision shapes in the tileset). The game needs to read these properties and create collision bodies or mark tiles as collidable. Investigate:

1. How does Tiled mark tiles as impassable? Check the tileset JSON for collision properties.
2. How does OverworldScene set up tile collision? Look at how collision bodies are created.
3. Are we reading tile properties from the Tiled JSON and creating collision bodies for blocked tiles?
4. Compare tiles that DO block vs tiles that DON'T — what's different?

## Acceptance Criteria

- [ ] Player cannot walk on water in Paper Town (spyder_paper_town)
- [ ] Player cannot walk through fences around the daycare in Paper Town
- [ ] Player cannot walk through cliff walls on Route 1 (spyder_route1)
- [ ] Existing working collisions (NPCs, some trees) still work
- [ ] Verified via puppeteer: attempt to walkTo through each barrier, confirm player is blocked
