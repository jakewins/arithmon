# STORY-0018: Stairs Teleport in Spyder Bedroom

## Description

When the player walks onto the stairs tile in `spyder_bedroom`, they should teleport down to `spyder_downstairs`. This is the first step toward making the spyder campaign playable after character creation.

This story also wires up `spyder_bedroom.yaml` as the map's event file and exports the `spyder_downstairs` map, establishing the pattern for per-map YAML event loading beyond `cotton_town`.

### Upstream reference

The upstream Tuxemon `spyder_bedroom.yaml` (at `mods/tuxemon/maps/spyder_bedroom.yaml` in the Tuxemon repo, branch `development`) defines this event:

```yaml
Go Downstairs:
  actions:
  - transition_teleport player,spyder_downstairs.tmx,0,2,0.3
  - char_face player,down
  conditions:
  - is char_at player
  type: event
  x: 7
  y: 2
```

### YAML coordinate bug

**Important:** The event loader (`src/game/event/loader.ts`, lines 77-80 and 89-92) divides `x`/`y`/`width`/`height` by `TILE_SIZE` (16), assuming pixel coordinates. This is correct for TMX-embedded object-layer events (like `water_end_of_desert.tmx`), but **standalone YAML event files from Tuxemon use tile coordinates directly** (e.g. `x: 7` means tile 7, not pixel 7).

This needs fixing as part of this story. The simplest fix is to stop dividing by TILE_SIZE in `loadEventsFromYaml()`, since all standalone YAML event files use tile coordinates. Check whether `cotton_town.yaml` (the only currently-loaded YAML) uses tile or pixel coords — if it has no positional events, the change is safe.

### Tasks

1. **Fix YAML loader coordinate handling** — Stop dividing `x`/`y`/`width`/`height` by `TILE_SIZE` in `loadEventsFromYaml()`. Verify `cotton_town.yaml` is unaffected.

2. **Copy upstream `spyder_bedroom.yaml`** into `public/assets/events/spyder_bedroom.yaml`. For now, include only the `Go Downstairs` event (the other events depend on stories 0019-0021). Alternatively, include the full file if unrecognised actions/conditions are gracefully skipped.

3. **Export `spyder_downstairs` map**
   - Fetch `spyder_downstairs.tmx` from upstream Tuxemon repo (`mods/tuxemon/maps/spyder_downstairs.tmx`)
   - Export with: `tiled --export-map --embed-tilesets mods/tuxemon/maps/spyder_downstairs.tmx public/assets/maps/spyder_downstairs.json`
   - Strip tileset image paths to bare filenames in the exported JSON
   - Copy any new tileset PNGs not already in `public/assets/maps/`
   - Register the map in `src/game/data/maps.ts`

4. **Load per-map YAML events in OverworldScene** — Currently only `cotton_town` loads events (hardcoded in `OverworldScene.create()`, lines 211-214). Generalise this so each map can have an associated YAML event file. Either:
   - Add an optional `eventsKey` field to the map registry
   - Or use a naming convention (`assets/events/{mapKey}.yaml`)

5. **Preload the new event file** in `OverworldScene.preload()` (or a shared preloader).

6. **Tests** — Verify the coordinate fix doesn't break existing events. Test that the `Go Downstairs` event definition loads with correct tile positions.

## Acceptance Criteria

- [ ] Walking onto tile (7, 2) in `spyder_bedroom` triggers a fade-out and teleport to `spyder_downstairs`
- [ ] `spyder_downstairs` map renders correctly with its tilesets
- [ ] YAML event `x`/`y` values are interpreted as tile coordinates (not divided by TILE_SIZE)
- [ ] Existing `cotton_town` events still work
- [ ] All checks pass (`npm run format:check && npm run lint && npx tsc --noEmit && npm test`)
