# STORY-0039: Debug Event Log

## Description

Add structured event logging to the game so that agents (and developers) can observe what's happening without needing screenshots. The debug bridge maintains a rolling buffer of events and supports a callback for real-time streaming.

**Depends on:** STORY-0038 (debug API foundation).

### API

```ts
A.events        // readonly array of recent events (rolling buffer, ~200 max)
A.onEvent(cb)   // register callback: (event: DebugEvent) => void
A.clearEvents() // clear the buffer
```

Each event is a simple structured object:

```ts
interface DebugEvent {
  type: string;
  time: number;    // performance.now()
  data: Record<string, unknown>;
}
```

### Event types to instrument

| Type | Where | Data |
|------|-------|------|
| `scene_started` | Each scene's `create()` | `{ scene: string }` |
| `scene_stopped` | Scene shutdown/sleep | `{ scene: string }` |
| `dialog_opened` | `dialog` action start | `{ text: string }` |
| `dialog_closed` | `dialog` action cleanup | `{}` |
| `choice_presented` | `translated_dialog_choice` start | `{ options: string[] }` |
| `choice_selected` | choice action cleanup | `{ index: number, text: string }` |
| `teleport` | `transition_teleport` action | `{ map: string, x: number, y: number }` |
| `encounter_started` | OverworldScene encounter trigger | `{ monster: string, level: number }` |
| `combat_state` | CombatMachine state change | `{ from: string, to: string }` |
| `combat_action` | CombatMachine action submitted | `{ action: string, events: CombatEvent[] }` |
| `math_problem_shown` | MathProblemScene create | `{ skill: string, type: string }` |
| `math_problem_answered` | MathProblemScene answer | `{ correct: boolean, answer: string }` |
| `npc_interact` | button_pressed condition met | `{ npc: string }` |
| `player_moved` | OverworldScene tile change | `{ fromX, fromY, toX, toY }` |
| `variable_set` | set_variable action | `{ key: string, value: string }` |

### Design

The `DebugBridge` (from STORY-0038) gains an `emit(type, data)` method. Each instrumentation point calls `debugBridge.emit(...)`. In production builds, `emit` is a no-op since the bridge isn't wired up.

To keep instrumentation lightweight, use a simple import:

```ts
import { debugBridge } from "./debug";
debugBridge.emit("dialog_opened", { text });
```

Since `debugBridge` is a singleton that exists in all builds, but `emit` only buffers/callbacks when dev mode is active, the overhead in production is a function call that returns immediately.

### Tasks

1. Add `emit()`, `events` buffer, `onEvent()`, and `clearEvents()` to `DebugBridge`
2. Instrument OverworldScene (scene start/stop, encounter, player tile change)
3. Instrument dialog and choice actions
4. Instrument teleport action
5. Instrument CombatScene / CombatMachine (state transitions, actions)
6. Instrument MathProblemScene (problem shown, answered)
7. Instrument set_variable action
8. Add tests for event buffer behavior (rolling buffer, callback invocation)

## Acceptance Criteria

- [ ] `A.events` contains structured log of recent game events
- [ ] `A.onEvent(cb)` fires for each event as it occurs
- [ ] Events cover scene transitions, dialog, combat, math problems, and movement
- [ ] Event buffer rolls over at ~200 entries (oldest discarded)
- [ ] Production builds have negligible overhead (no buffering)
- [ ] All code passes formatter, linter, typecheck, and tests
