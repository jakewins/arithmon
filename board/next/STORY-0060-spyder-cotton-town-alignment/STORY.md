# STORY-0060: Align Cotton Town with upstream spyder campaign

## Problem

Our codebase uses `cotton_town.json` which is the **xero** campaign version of Cotton Town from upstream Tuxemon. The spyder campaign (which we follow) has a separate, different map called `spyder_cotton_town` with different tilesets, tile data, and coordinates. We've been rendering the wrong map.

Key differences:
- **Tilesets**: Xero uses 4 tilesets (city_country, outdoor, buildings, set_pieces). Spyder uses 5 — same four but in a different order plus `core_outdoor_nature` which contains cliff/cave-entrance tiles.
- **Tile data**: 0% match on ground layer — completely different maps.
- **Coordinates**: Upstream teleports into spyder_cotton_town use y=39 for south entries; our events use y=38.
- **Map slug**: Upstream references `spyder_cotton_town.tmx` everywhere; we incorrectly use `cotton_town.tmx`.

## Goal

Make our spyder campaign Cotton Town render identically to upstream Tuxemon's `spyder_cotton_town`. We are a near-clone translating to TypeScript — our map data and event wiring should match upstream as closely as possible.

## Reference

Upstream Tuxemon is at `https://github.com/Tuxemon/Tuxemon.git`. Clone to `/tmp/tuxemon-upstream/` for cross-referencing.

The properly exported spyder_cotton_town JSON (with embedded tilesets, decoded tile arrays, fixed image paths) is already at:
- `public/assets/maps/spyder_cotton_town.json`

This was exported from upstream's `mods/tuxemon/maps/spyder_cotton_town.tmx` using Tiled 1.12.1 with `--export-map --embed-tilesets`, then post-processed to decode base64/zlib tile data to integer arrays and fix image paths to just filenames.

## Todos

### 1. Register `spyder_cotton_town` and verify map renders

In `src/game/data/maps.ts`, add a new entry:

```ts
spyder_cotton_town: {
  jsonKey: "map-spyder_cotton_town",
  jsonPath: "assets/maps/spyder_cotton_town.json",
  tilesets: [CORE_CITY_AND_COUNTRY, CORE_BUILDINGS, CORE_OUTDOOR, CORE_SET_PIECES, CORE_OUTDOOR_NATURE],
  environment: "grass",
},
```

Note the tileset order matches the JSON firstgid order: city_country(1), buildings(1441), outdoor(3791), set_pieces(6566), outdoor_nature(8116). This differs from the xero cotton_town order.

**Validate with puppeteer**: Use `/puppeteer` to launch the game, teleport to `spyder_cotton_town`, and take a screenshot. Verify the map renders with visible cliffs, grass, buildings, and outdoor_nature tiles (cave entrance area). Iterate until the map renders correctly with no missing/garbled tiles. Then run `npm run format:check && npm run lint && npx tsc --noEmit && npm test` and commit.

### 2. Create events and wire up map transitions

In `src/game/scenes/OverworldScene.ts`, add a preload line:
```ts
this.load.text("events-spyder_cotton_town", "assets/events/spyder_cotton_town.yaml");
```

Then create `public/assets/events/spyder_cotton_town.yaml` by porting events from the upstream TMX object layer. The upstream `spyder_cotton_town.tmx` has all its events embedded as object properties in the "Events" object layer. These need to be translated to our YAML event format.

Key events from upstream (extracted from the TMX):
- South edge teleports to `spyder_route1.tmx` (x=21-27, y=39 triggers)
- East edge teleports to `spyder_route2.tmx` (x=39, y=28-29)
- West edge teleports to `spyder_dryadsgrove.tmx` (x=0, y=7-8)
- Door entries: spyder_cotton_scoop (x=30,y=35), spyder_healing_center (x=20,y=27), spyder_cotton_cafe (x=31,y=17), spyder_cotton_artshop (x=16,y=17), spyder_cotton_house1 (x=27,y=27), spyder_cotton_house2 (x=25,y=9 and x=27,y=5), spyder_omnichannel1 (x=17,y=10)
- Tunnel entrance teleport to `spyder_cotton_tunnel.tmx` (player faces up to enter)
- NPC spawns: mom encounter, hacker encounters, monk, confused person, statues, lazy brute
- Music: `music_town_theme`
- Environment: grass/night_grass based on time

Use the existing `cotton_town.yaml` as a style reference for our YAML event format, but the content/coordinates must match upstream's spyder_cotton_town.

**Validate with puppeteer**: Use `/puppeteer` to spawn on `spyder_cotton_town` and walk the player south to the map edge — confirm the teleport to `spyder_route1` fires. Then walk back north from route1 into cotton town and confirm arrival at the correct coordinates. Test at least the south edge and one door entry (e.g. the scoop shop). Iterate until transitions work. Then run `npm run format:check && npm run lint && npx tsc --noEmit && npm test` and commit.

### 3. Update teleport references in other event files

These files currently reference `cotton_town.tmx` but should reference `spyder_cotton_town.tmx` with corrected coordinates:

| File | Current | Upstream |
|------|---------|----------|
| `public/assets/events/spyder_route1.yaml` | `cotton_town.tmx,10-16,38` | `spyder_cotton_town.tmx,21-27,39` |
| `public/assets/events/spyder_route2.yaml` | `cotton_town.tmx,38,17-18` | `spyder_cotton_town.tmx,39,28-29` |
| `public/assets/events/spyder_healing_center.yaml` | `cotton_town.tmx,22,28` | `spyder_cotton_town.tmx,20,27` |
| `public/assets/events/spyder_cotton_scoop.yaml` | `cotton_town.tmx,12,36` | `spyder_cotton_town.tmx,30,35` |
| `public/assets/events/spyder_cotton_tunnel.yaml` | `cotton_town.tmx,2,36` | `spyder_cotton_town.tmx,2,36` (same coords, just rename) |

**Validate with puppeteer**: Use `/puppeteer` to test the round-trip from `spyder_route1` north into `spyder_cotton_town`, then from cotton town south back to route1. Also test exiting the healing center and cotton scoop — confirm the player lands at the correct tile on spyder_cotton_town. Iterate until all transitions land correctly. Then run `npm run format:check && npm run lint && npx tsc --noEmit && npm test` and commit.

### 4. Update TypeScript references to `cotton_town`

- `src/game/debug.ts` — if it references cotton_town as a default/test map, update
- `qa/harness.ts` / `qa/campaign-playthrough.ts` — update any cotton_town references
- `src/game/data/npcs.ts` — check for cotton_town NPC references

Then run `npm run format:check && npm run lint && npx tsc --noEmit && npm test` and commit.

### 5. Remove old xero `cotton_town` from active use

The old `cotton_town.json` and `public/assets/events/cotton_town.yaml` are for the xero campaign which we don't use. Remove `cotton_town` from MAP_REGISTRY and the event preload line in OverworldScene. Keep the JSON/YAML asset files on disk in case we want xero later.

**Validate with puppeteer**: Use `/puppeteer` to run through the normal game flow — spawn on `spyder_paper_town`, walk to route1, walk north into cotton town. Confirm the full path works end-to-end with no errors or missing map references. Iterate until clean. Then run `npm run format:check && npm run lint && npx tsc --noEmit && npm test` and commit.

## Acceptance Criteria

- [ ] `spyder_cotton_town` registered in MAP_REGISTRY with all 5 tilesets
- [ ] Events file created matching upstream's spyder_cotton_town events
- [ ] All teleport references updated from `cotton_town.tmx` to `spyder_cotton_town.tmx` with correct upstream coordinates
- [ ] Game renders Cotton Town with cliffs, cave entrance, and outdoor_nature tiles
- [ ] `npm run format:check && npm run lint && npx tsc --noEmit && npm test` passes
