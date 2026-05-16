# STORY-0038: Debug API Foundation

## Description

Create a `DebugBridge` class that exposes game state and commands via the browser console, enabling AI agents (and human developers) to inspect and control the game programmatically.

The bridge is exposed as `window.A` in dev mode (`import.meta.env.DEV`), keeping the console ergonomic — `A.getState()`, `A.face("up")`, etc.

### Design

**`src/game/debug.ts`** — `DebugBridge` class

The bridge holds a reference to the active Phaser scene (updated on scene transitions). It provides:

**State queries:**
- `A.getState()` — returns a JSON-serializable snapshot:
  ```ts
  {
    scene: string;              // active scene key
    player: {
      tileX: number;
      tileY: number;
      facing: Direction;
      pixelX: number;
      pixelY: number;
    };
    session: {
      name: string;
      gender: string | null;
      template: string;
      variables: Record<string, string>;
      darkPower: number;
      monsters: Array<{ slug: string; level: number; currentHp: number; maxHp: number }>;
    };
    npcs: Array<{ slug: string; tileX: number; tileY: number; facing: Direction }>;
    blocking: boolean;          // whether the event engine is blocking input
  }
  ```
- `A.ready` — `true` once the first scene is active and the bridge is wired up

**Scene registration:**
Each scene calls `debugBridge.setScene(this)` in its `create()` method, so the bridge always knows which scene is active and can pull state from it.

### Wiring

- Create a singleton `DebugBridge` instance in `src/game/debug.ts`
- In `src/game/main.ts`, after game creation, assign `window.A = debugBridge` when `import.meta.env.DEV`
- Add a `declare global` block for TypeScript: `interface Window { A?: DebugBridge }`
- Each scene calls `debugBridge.setScene(this)` in `create()`

### State extraction

The bridge needs to read state from whichever scene is active. Since scenes have different shapes (OverworldScene has NPCs and a player sprite, CombatScene has monsters, etc.), the bridge can use the scene key to decide what to extract, or each scene can implement a small interface (`DebugStateProvider`) that returns its contribution to the state snapshot.

Prefer the interface approach — it keeps the bridge decoupled from scene internals:

```ts
interface DebugStateProvider {
  getDebugState(): Record<string, unknown>;
}
```

Each scene implements this, and `A.getState()` merges the result with session-level data.

### Tasks

1. Create `src/game/debug.ts` with `DebugBridge` class and `DebugStateProvider` interface
2. Implement `getState()` pulling from session + active scene
3. Implement `ready` flag
4. Wire up `window.A` in `main.ts` (dev mode only)
5. Add `DebugStateProvider` to `OverworldScene` (player pos, facing, NPCs, blocking state)
6. Add `DebugStateProvider` to `CombatScene` (combat state, monsters, dark power)
7. Add `DebugStateProvider` to `MathProblemScene` (current problem, input state)
8. Add `DebugStateProvider` to `CutsceneScene` (current event state)
9. Add TypeScript global declaration for `window.A`

## Acceptance Criteria

- [ ] `window.A` is available in the browser console when running `npm run dev`
- [ ] `A.getState()` returns a JSON-serializable snapshot of the current game state
- [ ] `A.ready` is `true` once a scene is active
- [ ] State includes player position, facing, session data, and scene-specific data
- [ ] `window.A` is `undefined` in production builds
- [ ] All code passes formatter, linter, typecheck, and tests
