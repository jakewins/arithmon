# STORY-0007: Event Engine + Dialog System

## Description

Implement a minimal event engine and dialog system modeled after Tuxemon's architecture, enabling NPC interactions and story scripting on the Cotton Town map. The goal is to get one NPC on the map that the player can walk up to, press interact, and see a dialog box — proving out the event pipeline that all future story content will flow through.

### Tuxemon Architecture Reference

Tuxemon's event system is built around three core contracts:

- **EventCondition** — A test that returns true/false. Evaluated every frame. All conditions in an event are AND'd together. An `operator` field (`is`/`not`) inverts the result at the evaluator level, not inside the condition.
  - Ref: [`tuxemon/event/eventcondition.py`](https://github.com/Tuxemon/Tuxemon/blob/development/tuxemon/event/eventcondition.py)

- **EventAction** — A unit of work with a `start()`/`update(dt)`/`cleanup()` lifecycle. Single-frame actions call `stop()` in their default `update()`. Multi-frame actions (like dialogs) block the action queue until they self-report as `done`.
  - Ref: [`tuxemon/event/eventaction.py`](https://github.com/Tuxemon/Tuxemon/blob/development/tuxemon/event/eventaction.py)

- **EventObject** — A named bundle of conditions + actions + an optional bounding box. Loaded from map files (TMX object properties or companion YAML).
  - Ref: [`tuxemon/db.py` lines 265-369](https://github.com/Tuxemon/Tuxemon/blob/development/tuxemon/db.py)

The **EventEngine** runs each frame: evaluate all event conditions, start new events whose conditions are met, and step running events forward one action at a time.
- Ref: [`tuxemon/event/eventengine.py`](https://github.com/Tuxemon/Tuxemon/blob/development/tuxemon/event/eventengine.py)

Running events are managed by **RunningEvent** which holds an action queue and steps through it sequentially. Single-frame actions complete immediately and the next action starts in the same frame. Multi-frame actions yield until the next frame.
- Ref: [`tuxemon/event/running.py`](https://github.com/Tuxemon/Tuxemon/blob/development/tuxemon/event/running.py)

**Behaviors** are macros that expand into conditions + actions (e.g., `talk npc_slug` expands to `char_facing_char` + `button_pressed INTERACT` conditions and a `char_face` action). We skip behaviors for this story — they're sugar we can add later.
- Ref: [`tuxemon/event/behaviors/talk.py`](https://github.com/Tuxemon/Tuxemon/blob/development/tuxemon/event/behaviors/talk.py)

**Variables** are string key:value pairs stored on the player, checked with `variable_set` condition and mutated with `set_variable` action.
- Ref: [`tuxemon/game_variables.py`](https://github.com/Tuxemon/Tuxemon/blob/development/tuxemon/game_variables.py)

**Dialog** is pushed as a state/scene overlay. `translated_dialog` calls `open_dialog()` which pushes a DialogState. The action polls each frame for the dialog to be dismissed.
- Ref: [`tuxemon/event/actions/translated_dialog.py`](https://github.com/Tuxemon/Tuxemon/blob/development/tuxemon/event/actions/translated_dialog.py)

### Our Design (TypeScript / Phaser)

Translated to fit our Phaser + TypeScript codebase:

#### Core Interfaces

```typescript
// --- Conditions ---
interface EventCondition {
  type: string;
  test(ctx: EventContext): boolean;
}

// --- Actions ---
interface EventAction {
  type: string;
  done: boolean;
  start(ctx: EventContext): void;
  update(ctx: EventContext, dt: number): void;  // default: this.done = true
  cleanup(ctx: EventContext): void;
}

// --- Event Object (loaded from map/data) ---
interface EventDef {
  id: number;
  name: string;
  x?: number;          // tile coords (undefined = global/non-spatial)
  y?: number;
  width?: number;      // default 1
  height?: number;     // default 1
  conditions: ConditionDef[];   // { operator: "is"|"not", type: string, args: string[] }
  actions: ActionDef[];         // { type: string, args: string[] }
}

// --- Shared context passed to conditions and actions ---
interface EventContext {
  scene: Phaser.Scene;
  player: { tileX: number; tileY: number; facing: Direction };
  variables: Map<string, string>;
  interactPressed: boolean;
  // ... extensible
}
```

#### Modules

| File | Responsibility |
|------|---------------|
| `src/game/event/types.ts` | Interfaces: `EventCondition`, `EventAction`, `EventDef`, `ConditionDef`, `ActionDef`, `EventContext` |
| `src/game/event/engine.ts` | `EventEngine` class — each-frame evaluation loop, manages `RunningEvent[]`, condition checking, action stepping |
| `src/game/event/running.ts` | `RunningEvent` class — sequential action queue with single-frame/multi-frame support |
| `src/game/event/conditions/` | Condition implementations: `char_at`, `char_facing_tile`, `button_pressed` |
| `src/game/event/actions/` | Action implementations: `dialog` (multi-frame), `create_npc`, `set_variable`, `char_face` |
| `src/game/event/registry.ts` | Action/condition registries mapping type strings to factory functions |
| `src/game/event/variables.ts` | `GameVariables` singleton — `get(key)`, `set(key, value)`, `has(key)` |

#### Dialog rendering

Rather than a full Phaser Scene (heavyweight for a text box), implement dialog as a **UI overlay within the OverworldScene** — a group of GameObjects (dark rectangle + text + "press enter" prompt) that the dialog action creates and polls. This is simpler than scene transitions and matches how Phaser games typically do dialog.

The `dialog` action:
1. `start()`: creates the dialog overlay, locks player controls
2. `update()`: checks if player pressed INTERACT to advance/dismiss
3. `cleanup()`: destroys the overlay, unlocks controls

#### NPC rendering

For this story, NPCs are simple: a static sprite at a tile position with a facing direction. The `create_npc` action adds a sprite to the scene. NPCs are tracked in a `Map<string, NpcState>` on the EventContext so conditions like `char_facing_tile` can find them.

#### Event data for this story

Hard-code one event inline (same pattern as our hard-coded math problem):

```typescript
const COTTON_TOWN_EVENTS: EventDef[] = [
  {
    id: 1,
    name: "Talk to Greeter",
    x: 20, y: 18, width: 1, height: 1,
    conditions: [
      { operator: "is", type: "char_facing_tile", args: ["player"] },
      { operator: "is", type: "button_pressed", args: ["INTERACT"] },
    ],
    actions: [
      { type: "dialog", args: ["Welcome to Cotton Town! The monsters here are restless..."] },
      { type: "set_variable", args: ["greeted:yes"] },
    ],
  },
];
```

### Tasks

1. **Define core interfaces** (`event/types.ts`)
   - `EventCondition`, `EventAction`, `ConditionDef`, `ActionDef`, `EventDef`, `EventContext`
   - Follow Tuxemon's contracts closely so we can parse their format later

2. **Implement GameVariables** (`event/variables.ts`)
   - Module-level singleton with `get()`, `set()`, `has()`, `remove()`
   - String key:value pairs, matching Tuxemon's `set_variable` format (`key:value`)

3. **Implement condition registry + first conditions** (`event/registry.ts`, `event/conditions/`)
   - Registry mapping type strings → factory functions
   - `char_facing_tile` — player is facing the event's tile zone
   - `button_pressed` — checks for INTERACT keypress this frame
   - `variable_set` — checks GameVariables

4. **Implement action registry + first actions** (`event/actions/`)
   - `dialog` — multi-frame: creates text overlay, waits for dismiss, cleans up
   - `set_variable` — single-frame: parses `key:value`, stores in GameVariables
   - `create_npc` — single-frame: adds a sprite at tile position (use player spritesheet recolored or a placeholder)

5. **Implement RunningEvent** (`event/running.ts`)
   - Holds action queue + current index
   - `step(ctx, dt)` — start next action if none running, update current, advance when done
   - Single-frame actions complete immediately and the next starts same frame (matching Tuxemon's budget loop)

6. **Implement EventEngine** (`event/engine.ts`)
   - Holds `EventDef[]` and `RunningEvent[]`
   - `update(ctx)` — check conditions for non-running events, start new RunningEvents, step running ones
   - Track running event IDs to prevent duplicate starts (Tuxemon does this)

7. **Wire into OverworldScene**
   - Create `EventEngine` in `create()`, pass hard-coded events
   - Build `EventContext` each frame in `update()` from player position, facing, and input state
   - Call `engine.update(ctx)` each frame
   - Add interact key (SPACE or Z) to input handling

8. **Place an NPC sprite on the Cotton Town map**
   - Add a static NPC sprite near the player start position
   - For now, hard-code placement in OverworldScene (the `create_npc` action can come later)
   - Use a frame from the existing player spritesheet or load a simple NPC sprite

9. **Implement dialog overlay**
   - Dark semi-transparent rectangle at bottom of screen (same position as combat message box)
   - Text rendered character-by-character or instantly
   - "▼" prompt when ready to dismiss
   - INTERACT key advances/dismisses
   - Locks player movement while active

## Acceptance Criteria

- [ ] Walking up to the NPC tile and pressing interact shows a dialog box
- [ ] Dialog box displays text and dismisses on keypress
- [ ] Player movement is locked during dialog
- [ ] `set_variable` fires after dialog and stores the variable
- [ ] Event does not re-fire while already running (no duplicate starts)
- [ ] `EventCondition` / `EventAction` interfaces match Tuxemon's contracts (test/start/update/done lifecycle)
- [ ] All code passes formatter, linter, typecheck, and tests
