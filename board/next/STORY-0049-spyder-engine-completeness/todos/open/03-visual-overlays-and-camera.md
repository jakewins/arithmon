# Todo: Visual Overlays and Camera

## What

Implement `set_layer`, `camera_position`, and `set_bubble` -- the visual effects needed for flashbacks, night tinting, NPC exclamation marks, and cutscene camera work.

## Why

`set_layer` is used extensively for flashback sequences (sepia tint `102:51:0:128`) and night mode (dark blue overlay). Without it, the Greenwash lab flashbacks, Nimrod flashbacks, and day/night cycle can't render correctly. `set_bubble` shows exclamation/question marks over NPCs when they notice the player -- it's a classic RPG cue. `camera_position` is used in cutscenes to pan to specific NPCs or locations.

## Upstream Reference

**`set_layer`** -- Apply RGBA color overlay to the entire screen:
```yaml
# Sepia flashback tint
- set_layer 102:51:0:128
# Night tint
- set_layer 0:0:80:120
# Clear overlay
- set_layer
```
The format is `R:G:B:A` where each is 0-255. When called with no args, it clears the overlay.

**`camera_position`** -- Move/lock camera to coordinates or reset to follow player:
```yaml
- camera_position 15,8         # lock camera to tile 15,8
- camera_position              # reset to follow player
```

**`set_bubble`** -- Show speech bubble icon over NPC:
```yaml
- set_bubble spyder_papertown_silver,exclamation
- set_bubble spyder_papertown_silver    # clear bubble
```
Upstream has bubble sprites in `gfx/ui/thought_bubble/` -- small icons that float above NPC heads.

## Visual Reference

- **Flashback sepia**: The screen gets a warm brownish overlay (`rgba(102, 51, 0, 0.5)`), NPCs from the past are spawned, dialog plays, then overlay clears. See `spyder_greenwash_level3.yaml` for 3 flashback sequences.
- **Night tint**: A dark blue semi-transparent overlay dims the whole scene. Applied via `update_time` / `set_layer` combination.

## Implementation

1. **`set_layer` action** (`src/game/event/actions/setLayer.ts`):
   - If no args: remove any existing overlay
   - Parse `R:G:B:A` from the argument
   - Create a full-screen Phaser rectangle at the topmost depth with `fillColor` and `fillAlpha`
   - Store reference on the scene so it can be cleared later
   - The overlay should persist across event actions (not just flash once)
   - Must work in OverworldScene (and ideally CutsceneScene too)

2. **`camera_position` action** (`src/game/event/actions/cameraPosition.ts`):
   - If no args: reset camera to follow player (`camera.startFollow(player)`)
   - If args: parse `x,y` as tile coordinates, stop camera follow, scroll to position
   - Optionally support smooth scrolling with a tween

3. **`set_bubble` action** (`src/game/event/actions/setBubble.ts`):
   - Parse: `npc_slug,bubble_type` or just `npc_slug` (to clear)
   - Find the NPC sprite on the current map
   - Render a small icon (exclamation mark, question mark) floating above their head
   - For now, can use a simple text sprite ("!") or ("?") if we don't have bubble art
   - Future: copy upstream bubble sprites from `gfx/ui/thought_bubble/`

4. **`check_world` condition** (`src/game/event/conditions/checkWorld.ts`):
   - Check if a `set_layer` overlay is currently active (or check its value)
   - Used in global events to check night state

## Verify with Puppeteer

Use `/puppeteer` to:
1. Teleport to any map, trigger `set_layer 102:51:0:128` via a test event -- screenshot should show sepia tint overlay
2. Trigger `set_layer 0:0:80:120` -- screenshot should show dark blue night tint
3. Trigger `set_layer` (no args) -- overlay should clear
4. Test `camera_position 5,5` -- camera should pan away from player
5. Test `camera_position` (no args) -- camera should snap back to follow player
6. Create an NPC, trigger `set_bubble npc_slug,exclamation` -- verify "!" appears above NPC
7. Screenshot the sepia flashback and compare to the warm brownish look described in upstream

## Done When

- `set_layer R:G:B:A` draws a colored overlay over the entire scene
- `set_layer` with no args clears the overlay
- `camera_position x,y` pans camera to tile; no args resets to player follow
- `set_bubble npc,exclamation` shows an indicator above an NPC's head
- Flashback sepia (102:51:0:128) looks like a warm brownish tint
- Night overlay (0:0:80:120) looks like a dark blue dimming
