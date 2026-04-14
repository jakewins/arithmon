# STORY-0008: Tuxemon Scenario Runner

## Description

Enable running Tuxemon-authored YAML scenario scripts on the Cotton Town map, proving we can reuse their story content. The target is the "Spyder" scenario's hacker intro cutscene — the player walks south, an NPC spawns, walks over, delivers dialog, then walks away and despawns. About 1 minute of scripted gameplay.

This builds on STORY-0007's event engine by adding the missing conditions, actions, behavior macros, and a YAML event loader. NPC pathfinding uses straight-line movement for now (A* is a follow-up in STORY-0009).

### What the scenario does

Adapted from `spyder_cotton_town.tmx` event 531 ("Talk hackerintro"):

1. Player walks into a trigger zone near the south exit
2. `lock_controls` — player can't move
3. Hacker NPC spawns off-screen, walks toward the player (`pathfind`)
4. Player auto-faces the NPC
5. Dialog: hacker introduces themselves
6. Hacker walks back and despawns
7. `set_variable spokencottonhacker:yes`, `unlock_controls`
8. Won't trigger again (variable guard)

### YAML event format

We'll use Tuxemon's YAML format (from their external event files):

```yaml
events:
  Hacker Intro:
    conditions:
      - is char_at player
      - not variable_set spokencottonhacker:yes
    actions:
      - lock_controls
      - create_npc hacker,25,30
      - pathfind hacker,25,36
      - char_face player,up
      - dialog Welcome to Cotton Town! Watch out for wild monsters...
      - dialog I'm a hacker. I can help you out. But first, you need to prove yourself.
      - pathfind hacker,25,30
      - remove_npc hacker
      - set_variable spokencottonhacker:yes
      - unlock_controls
    x: 400
    y: 576
    width: 48
    height: 16
```

Note: We use `dialog` with inline text instead of Tuxemon's `translated_dialog` + i18n key lookup. Translation support can come later.

### Tasks

1. **YAML event loader** (`event/loader.ts`)
   - Parse the YAML format into `EventDef[]`
   - Each event entry has optional `x`, `y`, `width`, `height` (in pixels, converted to tiles)
   - Conditions are strings: `"is char_at player"` → `{ operator: "is", type: "char_at", args: ["player"] }`
   - Actions are strings: `"dialog Hello world"` → `{ type: "dialog", args: ["Hello world"] }`
   - Use a lightweight YAML parser (e.g. `yaml` npm package) or hand-parse the simple subset we need
   - Load YAML from `assets/events/` at scene preload time

2. **New conditions**
   - `char_at` — true when the named character (only "player" for now) is standing inside the event's bounding box. This is distinct from `char_facing_tile` — it checks the player IS on the tile, not facing it.
   - `char_exists` — true if an NPC with the given slug exists in `ctx.npcs`
   - `char_facing_char` — true if the player is facing toward the named NPC (adjacent tile + correct direction). Used by the `talk` behavior.

3. **New actions**
   - `char_face` — single-frame: set a character's facing direction. Supports both literal directions (`char_face hacker,left`) and facing toward another character (`char_face player,hacker` — compute direction from positions). Updates the sprite frame to match.
   - `lock_controls` / `unlock_controls` — single-frame: set/clear a flag on EventContext that OverworldScene checks to suppress player input. Similar to the existing `blocking` mechanism but explicit and persistent (doesn't auto-clear when the action queue finishes).
   - `remove_npc` — single-frame: destroy the NPC's sprite and remove from `ctx.npcs`
   - `wait` — multi-frame: blocks the action queue for N seconds (parsed from args)
   - `pathfind` — multi-frame: move an NPC in a straight line toward a target tile at a fixed speed, updating sprite position and walk animation each frame. Completes when the NPC reaches the target tile. (Straight-line only — A* pathfinding is STORY-0009.)

4. **`talk` behavior expansion**
   - When loading events, expand `behav` entries (e.g. `talk hacker`) into conditions + actions:
     - Adds conditions: `char_facing_char player,<npc>` + `button_pressed INTERACT`
     - Prepends action: `char_face <npc>,player` (NPC turns to face player)
   - Match Tuxemon's `TalkBehavior.expand()` contract

5. **NPC sprite registry** (`data/npcs.ts`)
   - Minimal map of NPC slug → sprite config: `{ spritesheet: string, frame: number }`
   - For now, 2-3 entries reusing the player spritesheet with different idle frames
   - `create_npc` action looks up the slug here to pick the right sprite
   - Unknown slugs fall back to the player spritesheet (so any Tuxemon NPC slug works, just looks the same)

6. **Wire YAML events into OverworldScene**
   - Preload a YAML file from `assets/events/cotton_town.yaml`
   - Replace hard-coded `COTTON_TOWN_EVENTS` with parsed events
   - Add `controlsLocked` flag to OverworldScene, checked alongside `blocking`
   - Remove the hard-coded greeter NPC (it will be defined in the YAML instead)

7. **Create the scenario YAML file** (`assets/events/cotton_town.yaml`)
   - Adapt the Spyder hacker intro event for our map layout
   - Include a simple "talk to NPC" interaction as well (using `behav: talk`)
   - Include a sign interaction (face tile + interact → dialog)

8. **Tests**
   - YAML loader: parse a sample YAML string into correct `EventDef[]`
   - Behavior expansion: `talk npc_slug` produces correct conditions + actions
   - `char_at` condition: inside/outside bounding box
   - `char_exists` condition: present/absent NPC
   - `char_facing_char` condition: correct/incorrect facing
   - `wait` action: completes after elapsed time

## Acceptance Criteria

- [ ] A YAML file in `assets/events/` defines all Cotton Town events
- [ ] Walking into the trigger zone starts the hacker intro cutscene
- [ ] Player controls are locked during the cutscene
- [ ] NPC spawns, walks to player (straight line), delivers dialog, walks away, despawns
- [ ] Variable guard prevents the cutscene from replaying
- [ ] A second NPC can be talked to via `behav: talk` (face + interact → dialog)
- [ ] Reading a sign works (face tile + interact → dialog)
- [ ] All code passes formatter, linter, typecheck, and tests
