# STORY-0231 — Implementation Journal

## 2026-05-21 — Reviewer findings (approved)

### What was validated

- Pre-commit gates re-run in the reviewer worktree: `format:check`, `lint`,
  `npx tsc --noEmit`, and `vitest run` all pass (43 test files, 484 tests).
- Code review: the change is clean and minimal — 45 lines across 7 files.
  - `session.ts`: `darkPower: number` added to `PlayerState`, initialised to
    `MAX_DARK_POWER` in `createSession()`. `resetSession()` picks it up
    automatically by delegating to `createSession()`. Import of
    `MAX_DARK_POWER` from `./combat/machine` is clean (no circular dep).
  - `machine.ts`: `initialDarkPower` added as the last optional constructor
    arg with `MAX_DARK_POWER` default; field initialiser changed to an
    assignment in the constructor body. All existing tests that construct
    `CombatMachine` directly still work unchanged.
  - `CombatScene.ts`: seeds machine from `session.player.darkPower` in
    `init`, writes `machine.darkPower` back to `session.player.darkPower`
    in a `this.events.once("shutdown", ...)` handler registered in
    `create()`. The shutdown hook fires on all exit paths (win, lose, fled,
    debug teardown).
  - `save.ts`: `darkPower` serialised in `saveGame()` and restored in
    `loadGame()` with `?? MAX_DARK_POWER` fallback for pre-0231 saves. No
    `version` bump — back-compat handled by the optional field.
  - `debug.ts`: stale `session.skillEncounter` wiring replaced with
    `session.player.darkPower`. `window.A.getState().session.darkPower` now
    reflects the real persistent value.
  - `machine.test.ts`: one new test confirming `initialDarkPower = 2` seeds
    the machine at 2 and that the omitted-arg default is 5.
  - `skilltree.test.ts`: one-line fix to mock object to satisfy the newly
    required `darkPower` field on `PlayerState`.

- Test coverage is appropriate — the new test nails the constructor contract
  without over-specifying internals. No existing tests were made redundant
  by this change.

- QA script written and run (`qa/local/dark-power-persist.ts`):
  1. `setupGame()` → battle 1 spawned, DP manually set to 3, enemy to 1 HP.
  2. First attack fired → battle won. Back in OverworldScene.
  3. `session.player.darkPower` read via debug bridge → **1** (spent 2 DP
     on the attack from DP=3; correctly not 5).
  4. Battle 2 spawned immediately. `getCombatState` on battle 2 start →
     **DP = 1** (not 5 — carry-over confirmed).
  5. Screenshot taken: 1 filled pip / 4 empty on the battle-2 HUD —
     matches the numeric value visually.
  6. Fled battle 2 → back in OverworldScene. `session.player.darkPower`
     → **1** (fled outcome also persists correctly).

- All acceptance criteria satisfied.

### Outcome: approved

Story moved to `board/done/`.
