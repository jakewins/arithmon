# STORY-0012: Cutscene Scene with change_bg

## Description

Add a `CutsceneScene` that can run YAML events on a blank screen (no tilemap), and implement the `change_bg` action. This is the next step toward supporting Tuxemon's `start_tuxemon.yaml`, which runs a series of choice menus over a colored background before teleporting to the first map.

For now, we wire a debug key ("V") in the OverworldScene to launch a sample cutscene, proving the plumbing works. The cutscene is a miniature version of the `start_tuxemon.yaml` pattern: background color → choice → branching response → return to overworld.

### Sample cutscene YAML (`assets/events/sample_cutscene.yaml`)

Mirrors `start_tuxemon.yaml`'s structure — variable-guarded events that chain automatically:

```yaml
events:
  Ask Favorite:
    conditions:
      - not variable_set favorite
    actions:
      - change_bg blue
      - dialog Welcome, trainer! Before we begin...
      - translated_dialog_choice fire:water:grass,favorite

  Pick Fire:
    conditions:
      - is variable_set favorite:fire
      - not variable_set cutscene_done:yes
    actions:
      - dialog Bold choice! Fire types are fierce.
      - set_variable cutscene_done:yes

  Pick Water:
    conditions:
      - is variable_set favorite:water
      - not variable_set cutscene_done:yes
    actions:
      - dialog Wise choice! Water types are versatile.
      - set_variable cutscene_done:yes

  Pick Grass:
    conditions:
      - is variable_set favorite:grass
      - not variable_set cutscene_done:yes
    actions:
      - dialog Natural choice! Grass types are resilient.
      - set_variable cutscene_done:yes

  Farewell:
    conditions:
      - is variable_set cutscene_done:yes
      - not variable_set cutscene_farewell:yes
    actions:
      - dialog Good luck on your journey!
      - set_variable cutscene_farewell:yes
      - end_cutscene
```

The "Ask Favorite" event has no spatial or interact conditions — it fires on the first frame where `not variable_set favorite` is true (i.e. immediately on scene load). This matches how `start_tuxemon.yaml` events work.

### What to build

1. **`CutsceneScene`** — A Phaser scene that:
   - Loads a YAML events file (key passed via scene launch data)
   - Runs an `EventEngine` with those events
   - Has a solid-color background (default black, changed by `change_bg`)
   - Builds an `EventContext` each frame — no player position or NPCs needed, just variables, scene, and interactPressed
   - Stops itself and resumes the caller when `end_cutscene` fires

2. **`change_bg` action** — Single-frame action that sets the scene's background color.
   - Syntax: `change_bg <color>` where color is a named color (blue, red, green, black, etc.)
   - Tuxemon supports gradients and overlay images — for now just solid named colors
   - Sets `scene.cameras.main.setBackgroundColor(color)`

3. **`end_cutscene` action** — Single-frame action that signals the cutscene is done.
   - Sets a flag on EventContext that CutsceneScene checks each frame
   - CutsceneScene then stops itself and resumes the parent scene

4. **Debug key "V" in OverworldScene** — Pauses overworld, launches CutsceneScene with the sample YAML, similar to existing "C" (combat) and "P" (math) debug keys.

5. **Sample YAML file** (`assets/events/sample_cutscene.yaml`) — The YAML above.

### Tasks

1. **`change_bg` action** (`event/actions/changeBg.ts`)
   - Single-frame: parse color name, call `scene.cameras.main.setBackgroundColor()`
   - Support basic palette: black, white, red, green, blue, plus hex (`#rrggbb`)

2. **`end_cutscene` action** (`event/actions/endCutscene.ts`)
   - Single-frame: sets `ctx.controls.cutsceneDone = true` (extend EventContext.controls)

3. **`CutsceneScene`** (`scenes/CutsceneScene.ts`)
   - `init(data)` receives `{ yamlKey: string, callerScene: string }`
   - `create()`: reads cached YAML, parses events, creates EventEngine, wires SPACE/Z for interact
   - `update()`: builds EventContext, steps engine, checks `cutsceneDone` flag
   - On done: `this.scene.stop()` + `this.scene.resume(callerScene)`

4. **Wire debug key "V"** in OverworldScene
   - Preload `sample_cutscene.yaml`, launch on keydown-V

5. **Tests**
   - `change_bg` sets background color
   - `end_cutscene` sets the done flag
   - Event chain fires correctly: choice → branch → farewell → end

## Acceptance Criteria

- [ ] Pressing "V" on the overworld opens a cutscene on a colored background
- [ ] Cutscene presents a choice menu (fire/water/grass)
- [ ] Branching response fires automatically based on choice (no re-interaction)
- [ ] Cutscene ends and returns to the overworld after the farewell
- [ ] `change_bg` sets the scene background color
- [ ] Sample YAML follows the same structural pattern as `start_tuxemon.yaml`
- [ ] All code passes formatter, linter, typecheck, and tests
