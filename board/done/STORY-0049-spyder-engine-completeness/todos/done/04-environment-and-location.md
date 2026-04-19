# Todo: Environment and Location System

## What

Implement `set_environment`, `environment_is`, `location_inside`, and `location_type` -- the map metadata system that tracks what kind of area the player is in.

## Why

The environment system drives battle backgrounds (grass, cave, ocean, interior) and affects encounter behavior. `location_inside` and `location_type` are used in global events like `spyder.yaml` to conditionally apply night tinting only outdoors, and to trigger healing-center-specific events.

## Upstream Reference

**`set_environment`** -- Override the map's default environment:
```yaml
- set_environment cave
- set_environment interior
- set_environment night_ocean
```
Environments defined in upstream: grass, cave, ocean, interior, forest, desert, beach, snow, canyon, bridge, cliff, plains, sea, valley, night_* variants.

**`environment_is`** condition:
```yaml
- is environment_is cave
- not environment_is interior
```

**`location_inside`** condition -- checks if current map is an interior (roofed) location:
```yaml
- not location_inside    # only apply night tint if outdoors
```
This is typically set as a map property in the TMX file (`inside: true`).

**`location_type`** condition -- checks map type tag:
```yaml
- is location_type clinic    # only in healing centers
```

## Implementation

1. **Add `environment` and `location` metadata to session/map state**:
   - Each map already has an `environment` property (used for battle backgrounds)
   - Add `inside: boolean` and `locationType: string` properties to map metadata
   - Parse these from map JSON properties when loading a map

2. **`set_environment` action** (`src/game/event/actions/setEnvironment.ts`):
   - Override the current map's environment value in session
   - This affects battle background selection (already implemented in STORY-0048)

3. **`environment_is` condition** (`src/game/event/conditions/environmentIs.ts`):
   - Compare current environment against the argument

4. **`location_inside` condition** (`src/game/event/conditions/locationInside.ts`):
   - Return the current map's `inside` property
   - Maps like healing centers, houses, shops → `inside: true`
   - Routes, towns, parks → `inside: false`

5. **`location_type` condition** (`src/game/event/conditions/locationType.ts`):
   - Compare current map's type tag against argument (e.g., "clinic", "shop", "town")

6. **Update map JSON files** to include `inside` and `locationType` properties where appropriate:
   - `spyder_healing_center.json` → `inside: true, locationType: "clinic"`
   - `spyder_cotton_scoop.json` → `inside: true, locationType: "shop"`
   - `spyder_bedroom.json`, `spyder_downstairs.json` → `inside: true`
   - `spyder_route1.json` → `inside: false`

## Verify with Puppeteer

Use `/puppeteer` to:
1. Teleport to healing center, check `getState()` -- environment should reflect interior
2. Trigger a test event with `is location_inside` -- should be true indoors
3. Trigger a test event with `is location_type clinic` -- should be true in healing center
4. Teleport to Route 1, check `not location_inside` -- should be true outdoors
5. Trigger `set_environment cave`, start a wild battle, verify cave background renders
6. Reset environment, verify grass background returns

## Done When

- `set_environment` changes battle background and current environment tag
- `environment_is` checks current environment
- `location_inside` returns true for indoor maps, false for outdoor
- `location_type` checks map type (clinic, shop, etc.)
- Map JSON files have `inside` and `locationType` properties set
