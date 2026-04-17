# STORY-0040: Debug Commands

## Description

Add input simulation commands to the debug bridge so agents can control the game programmatically. These commands simulate the same inputs a player would use — pressing buttons, making choices — but via `A.interact()` etc. from the console or Playwright.

**Depends on:** STORY-0038 (debug API foundation).

### API

All commands return Promises so callers can `await` them:

```ts
// Simulate spacebar / Z press (interact with NPC, advance dialog)
await A.interact()

// Turn the player to face a direction
await A.face("up")

// Select a dialog choice by index (0-based)
await A.selectChoice(0)

// Type into the math problem input and submit
await A.typeAnswer("42")
await A.submitAnswer()

// Wait until the event engine is no longer blocking
await A.waitForIdle()

// Wait for a specific event type to appear in the log
await A.waitForEvent("dialog_opened")
```

### Implementation approach

**`interact()`** — sets the same `interactPressed` flag that the SPACE/Z key handler sets. Returns a promise that resolves after one frame (the event engine picks up the flag in the next `update()`). Optionally, could resolve after `waitForIdle()` so the caller knows the triggered interaction has completed — but the simpler one-frame version is more flexible (caller can decide whether to wait).

Recommend: `interact()` sets the flag and resolves immediately. The caller uses `await A.waitForIdle()` or `await A.waitForEvent(...)` afterward if they need to wait for the result.

**`face(direction)`** — sets player velocity to zero (if moving) and updates the facing direction + sprite frame. Resolves immediately.

**`selectChoice(index)`** — the choice dialog system needs a small hook: when a choice is visible, `selectChoice` sets the selection index and simulates a confirm press. This is scene-specific (the choice UI is in OverworldScene/CutsceneScene). The bridge routes the command to the active scene.

**`typeAnswer(text)` / `submitAnswer()`** — MathProblemScene-specific. `typeAnswer` sets the input field value directly. `submitAnswer` triggers the submit logic. The bridge routes these to MathProblemScene when it's active.

**`waitForIdle()`** — polls `getState().blocking` each frame, resolves when `false`. Uses `requestAnimationFrame` loop internally, with a timeout (default 10s) to avoid hanging forever.

**`waitForEvent(type, timeout?)`** — registers an `onEvent` callback, resolves when an event of the given type fires. Times out with rejection after `timeout` ms (default 10s).

### Tasks

1. Implement `interact()` — set interact flag on active scene
2. Implement `face(direction)` — update player facing
3. Implement `selectChoice(index)` — hook into choice dialog system
4. Implement `typeAnswer(text)` and `submitAnswer()` — hook into MathProblemScene
5. Implement `waitForIdle()` — frame-polling promise
6. Implement `waitForEvent(type, timeout?)` — event-callback promise
7. Add tests for command routing and promise resolution

## Acceptance Criteria

- [ ] `A.interact()` triggers the same behavior as pressing spacebar
- [ ] `A.face(dir)` changes the player's facing direction
- [ ] `A.selectChoice(n)` picks a dialog choice programmatically
- [ ] `A.typeAnswer()` and `A.submitAnswer()` control the math problem UI
- [ ] `A.waitForIdle()` resolves when the event engine is no longer blocking
- [ ] `A.waitForEvent(type)` resolves when the specified event fires
- [ ] All commands return Promises
- [ ] All code passes formatter, linter, typecheck, and tests
