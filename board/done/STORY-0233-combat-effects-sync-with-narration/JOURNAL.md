# STORY-0233 — Implementation Journal

## 2026-05-21 — Implementation

### Approach

Picked H1 (per-event `apply` closures). Visible-state mutations (HP, DP,
totalXp, status, `this.player`/`this.enemy` pointers, capture callback,
inventory removal) are now deferred into each `CombatEvent`'s `apply`
closure; the CombatScene narrator runs them in lockstep with the
on-screen message.

State-machine fields (`state`, `outcome`) DO still flip synchronously
inside `submitAction` — that's the implementor's call per the story
("probably fine — confirm with the implementor"). Rationale: only the
*player-visible* effects need narration lockstep; external readers like
`start_battle` already wait on a separately-fired `combat_state` event,
and gating those would have required ~3x more event-chaining plumbing
with no observable benefit.

### Files changed

- `src/game/combat/techniqueExecutor.ts` — `ExecutorEvent` grows an
  `apply?` field. Damage / heal / statStage effects no longer mutate;
  they bake the mutation into the closure. Status apply routes through
  the new `previewApplyStatus` helper.
- `src/game/combat/statusHandler.ts` — `previewApplyStatus` added;
  `tickStatuses` no longer mutates — each `StatusLogEvent` carries an
  `apply` closure (tick damage + duration decrement, or status removal).
  Sleep mid-duration emits a quiet decrement-only event (empty message,
  filtered out by the machine before narration).
- `src/game/data/statuses.ts` — `onTurnEnd` callbacks for poison / burn
  no longer mutate `monster.currentHp`; they only compute the tick.
  Damage is clamped against currentHp at compute time.
- `src/game/combat/machine.ts` — `CombatEvent` grows an `apply?` field.
  `submitAction` and helpers (`performAttack`, `processItemAction`,
  `processCaptureAction`, `awardXp`, `tickEndOfTurn`,
  `handlePlayerFaint`, `handleEnemyFaint`) refactored to compute
  projected HP / XP / DP up front and capture mutations into per-event
  closures. `predictLevelUps` runs `Monster.addXp` on a sandbox clone
  so we know exactly which `level_up` / `move_learned` events to queue
  without mutating the live monster up front. `resolveActivePlayerAfter`
  walks a forming event list to find the player monster the enemy
  counter-attack should target after a queued swap_in.
- `src/game/scenes/CombatScene.ts` — `processNextEvent` now calls
  `event.apply?.()` immediately before setting message text, then runs
  `tweenHpBars()` (500 ms `Quint.easeOut`, matching upstream's 0.7 s
  `animate_hp` in `combat_animations.py:293-305`) instead of the old
  snapping `updateHpBars()`. `drainNextCombatEvent()` (QA hook) and
  `peekCombatModel()` added. `debugSubmitCombatAction` now also pushes
  events into the scene's `eventQueue` so QA can step them manually.
- `src/game/debug.ts` / `qa/harness.ts` — `peekCombatModel` and
  `drainNextCombatEvent` exposed.
- `src/__tests__/_combatTestHelpers.ts` — new `drainEvents(events)`
  helper. Used to migrate tests that previously asserted post-submit
  model state.
- `src/__tests__/machine.test.ts`, `combat-items.test.ts`,
  `capture.test.ts`, `swap.test.ts`, `trainer-battle.test.ts`,
  `xp.test.ts`, `statuses.test.ts`, `statStages.test.ts` — migrated
  to drain events before asserting on `currentHp` / `darkPower` /
  `totalXp` / `machine.player`. Added a new "deferred mutation
  contract" describe-block to `machine.test.ts` pinning the contract.

### QA verification

`qa/local/combat-effects-sync.ts` (state-snapshot approach per the
story):

1. Vanilla fight: `submitCombatAction` returned events with the model
   unchanged (HP, DP unchanged immediately after call). Stepping
   through events one at a time confirmed DP drops on the `dp_drain`
   step and enemy HP drops on the `damage` step (not earlier).
   Screenshot `combat-effects-synced.png` captured mid-narration shows
   HP bars still full just before the damage step.
2. KO scenario (enemy at 1 HP): faint flag flips on the `damage` step,
   `xp_gain` step credits XP. No pre-`xp_gain` event bumps totalXp.

Swap_in flipping `this.player`/`this.enemy` at the swap_in step is
covered by `swap.test.ts` and `trainer-battle.test.ts` unit tests
(QA-script coverage was nice-to-have, dropped to keep the puppeteer
script lean — see the note at the end of the script).

A manual menu-driven sanity check (FIGHT → first technique) confirmed
that during real combat the on-screen HP bar visibly tweens over ~500 ms
when the damage event narrates, instead of snapping at the start of the
turn.

### Pre-commit gates

`npm run format:check && npm run lint && npx tsc --noEmit && npm test`
all pass — 490/490 tests green.

---

## 2026-05-21 — Reviewer findings (approved)

### What was validated

- Pre-commit gates re-run in the reviewer worktree: `format:check`, `lint`,
  `npx tsc --noEmit`, and `vitest run` all pass (43 test files, 490 tests).

- Code review: clean, well-structured refactor — 929 lines across 18 files.
  - Core design: `CombatEvent` grows an optional `apply?: () => void` closure.
    All visible-state mutations (HP, DP, XP, status, player/enemy pointers,
    inventory removal, capture callback) are now deferred into those closures;
    `submitAction` computes the full turn outcome up front using `projected*`
    locals, never touching live model fields. State-machine fields (`state`,
    `outcome`) still flip synchronously — correct, as documented.
  - `techniqueExecutor.ts`: damage/heal/statStage/status-apply all baked into
    `apply` closures. `previewApplyStatus` added to `statusHandler.ts` for
    the deferred-status case.
  - `statusHandler.ts`: `tickStatuses` now non-mutating; each `StatusLogEvent`
    carries its own `apply` closure (tick damage + duration decrement, or
    status removal). Quiet empty-message events for sleep mid-duration are
    filtered by the machine before narration — sound design.
  - `machine.ts`: `predictLevelUps` sandbox-clones the monster before calling
    `addXp` so the level-up/move-learned narration can be queued up front
    without mutating the live monster. `resolveActivePlayerAfter` walks the
    forming event list to correctly point the enemy counter-attack at the
    incoming swap target — slightly fragile (message-parse) but correct for
    current data.
  - `CombatScene.ts`: `processNextEvent` calls `event.apply?.()` before
    setting message text, then `tweenHpBars()` (500 ms Quint.easeOut). End-of-
    queue `updateHpBars()` is a safety-snap; it fires ~500 ms after the last
    tween completes so there is no visual interruption in practice.
  - `drainNextCombatEvent()` and `peekCombatModel()` QA hooks are well-scoped
    and correctly mirror `processNextEvent` logic.

- Unit test review: `_combatTestHelpers.ts` `drainEvents` helper is clean and
  minimal. All 8 migrated test files correctly drain before asserting on model
  state. The new "deferred mutation contract" describe-block in `machine.test.ts`
  pins the contract at the right level of detail — not over-specified.

- QA script (`qa/local/combat-effects-sync-review.ts`) run against port 8082:
  - Enemy HP (60) and DP (5) both unchanged immediately after `submitCombatAction`.
  - DP dropped from 5→3 exactly at the `dp_drain` drain step.
  - Enemy HP dropped from 60→33 exactly at the `damage` drain step.
  - KO path: `player.totalXp` (125) unchanged after submit; jumped to 185 at
    the `xp_gain` drain step.
  - Screenshots confirm correct visual state: full HP bars before any drain;
    damage narration showing at the moment HP model mutates.

- Tween duration (500 ms) is within the AC range (400–700 ms) and matches
  upstream `animate_hp` easing (Quint.easeOut).

### Outcome: approved

Story moved to `board/done/`.
