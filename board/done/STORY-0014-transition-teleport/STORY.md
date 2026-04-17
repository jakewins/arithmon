# STORY-0014: transition_teleport Action and Multi-Map Support

## Description

Implement Tuxemon's `transition_teleport` action so YAML cutscenes and events can fade to black, switch to a different map, and place the player at specific tile coordinates on the new map. This is the last missing piece for running `start_tuxemon.yaml` end-to-end.

### Tuxemon syntax

```
transition_teleport player,<map>.tmx,<tileX>,<tileY>,<duration>
```

- `player` — target (only value supported)
- `<map>.tmx` — destination map file (Tuxemon uses `.tmx`; we'll accept the name and resolve to our `.json` equivalent)
- `<tileX>`, `<tileY>` — tile coordinates to spawn on the new map
- `<duration>` — fade duration in seconds (e.g. `0.3`, `0.5`)

In `start_tuxemon.yaml`, this fires after the choice cutscene finishes and sends the player into the opening bedroom (or desert) map.

### Scope

We do **not** need to support all three `start_tuxemon.yaml` destinations (`spyder_bedroom`, `player_house_bedroom`, `water_end_of_desert`). One destination is enough to prove the mechanic. Additional destinations are follow-up work (each is ~1 small story: run Tiled export, copy tilesets, register in preload).

**Chosen destination for this story: `player_house_bedroom.tmx`** — it's a 9×7 bedroom and shares the `core_set pieces` tileset we already have. We need to add three indoor tilesets (`core_indoor_floors`, `core_indoor_stairs`, `core_indoor_walls`), but those are already present in the Tuxemon repo.

### What to build

1. **`transition_teleport` action** (`event/actions/transitionTeleport.ts`)
   - Parse: `player,<mapName>,<tileX>,<tileY>,<duration>`
   - Strip `.tmx` suffix if present so the name works as a map key
   - Multi-frame action: fades the camera, then signals the scene to swap maps, then fades back in
   - Blocking while the transition is in progress
   - Implementation approach: set a field on `ctx.controls` (e.g. `pendingTeleport: { mapKey, tileX, tileY, duration }`) and let the active scene react to it. The action stays "running" until the flag is consumed (scene clears it when the teleport is complete).

2. **Multi-map support in `OverworldScene`**
   - Refactor so the map key is not hardcoded — currently `cotton_town` is hardwired in `preload()` and `create()`.
   - Accept a `init(data: { mapKey, spawnTileX, spawnTileY, spawnFacing? })` so the scene can be (re)launched for any map.
   - Preload all known maps + tilesets upfront so teleports don't require a separate loading step.
   - Map registry: a small data file/object mapping map key → `{ jsonKey, tilesets: string[] }` so we don't duplicate tileset lists in `preload` and `create`.

3. **Destination map: `player_house_bedroom`**
   - Run `tiled --export-map --embed-tilesets mods/tuxemon/maps/player_house_bedroom.tmx public/assets/maps/player_house_bedroom.json`
   - Copy indoor tileset PNGs into `public/assets/maps/`:
     - `core_indoor_floors.png`
     - `core_indoor_stairs.png`
     - `core_indoor_walls.png`
   - Register the new map in the map registry

4. **Teleport flow in `OverworldScene`**
   - Each frame, after stepping the event engine, check `ctx.controls.pendingTeleport`.
   - If set:
     - Start a camera fade-out over `duration` seconds.
     - On fade complete: `this.scene.restart({ mapKey, spawnTileX, spawnTileY })` (or equivalent) to reinitialize with the new map.
     - Phaser fades back in automatically on scene start, or we explicitly fade in.
   - Clear `pendingTeleport` once consumed so the action can mark itself `done`.

5. **Cutscene → overworld teleport plumbing**
   - If a `transition_teleport` fires from `CutsceneScene`, the cutscene stops itself and launches/switches to `OverworldScene` with the target map and coordinates instead of resuming the caller normally.
   - In practice: when `CutsceneScene` sees `pendingTeleport`, it stops and starts `OverworldScene` with the teleport data (not `this.scene.resume(callerScene)`).

6. **Update `start_tuxemon.yaml` test / demo**
   - Extend `sample_cutscene.yaml` (or add a new yaml) to end with `transition_teleport player,player_house_bedroom,4,4,0.3` instead of `end_cutscene`, so pressing "V" demonstrates the full flow: cutscene → fade → bedroom.
   - Keep `end_cutscene` working for non-teleport exits.

7. **Tests**
   - Parsing: `transition_teleport player,foo.tmx,4,4,0.3` produces the expected fields (including `.tmx` stripped).
   - Action sets `ctx.controls.pendingTeleport` to the right shape.
   - Action stays not-done while `pendingTeleport` is set; becomes done once cleared.
   - Map registry contains both `cotton_town` and `player_house_bedroom`.
   - (Scene integration with real Phaser fade is not easily unit-testable — test the action logic and leave the visual fade for manual verification.)

### Implementation notes

- Phaser's `cameras.main.fadeOut(duration, r, g, b)` emits `Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE` — hook into that to trigger the scene restart.
- `this.scene.restart(data)` calls `init(data)` again and reruns `create()`, which should be enough if all preloads are done in `preload()`.
- Spawn facing defaults to `down` if not specified.
- The sample_cutscene.yaml rewrite should be backward-compatible in tests — keep any existing test that uses `end_cutscene` working by not breaking `end_cutscene`'s behavior.

## Tasks

1. Add `player_house_bedroom.json` and indoor tileset PNGs under `public/assets/maps/`
2. Create a map registry (`src/game/data/maps.ts` or similar) with `{ key, jsonKey, tilesets }`
3. Refactor `OverworldScene.preload()` and `create()` to use the registry and accept `init(data)` for map key + spawn position
4. Implement `transition_teleport` action (multi-frame; sets `ctx.controls.pendingTeleport`)
5. Extend `EventContext.controls` with the `pendingTeleport` field
6. Register the new action in `engine.ts`
7. Handle `pendingTeleport` in `OverworldScene.update()` — fade, restart with new map, clear flag
8. Handle `pendingTeleport` in `CutsceneScene.update()` — fade, stop cutscene, start OverworldScene with teleport data
9. Update `sample_cutscene.yaml` to finish with a teleport demo
10. Tests for action parsing and behavior, plus map registry coverage
11. Run format:check, lint, typecheck, tests before committing

## Acceptance Criteria

- [ ] `transition_teleport player,player_house_bedroom,4,4,0.3` in a YAML event triggers a fade, map switch, and respawn
- [ ] `OverworldScene` can load either `cotton_town` or `player_house_bedroom` based on init data
- [ ] Pressing "V" plays the sample cutscene and ends by teleporting into the bedroom map (instead of just returning)
- [ ] `.tmx` suffix in the YAML is accepted and stripped
- [ ] Fade duration matches the YAML parameter (0.3s, 0.5s, etc.)
- [ ] `end_cutscene` still works for cutscenes that don't teleport
- [ ] All existing tests pass; new tests cover the action and map registry
- [ ] All code passes formatter, linter, typecheck, and tests
