# STORY-0233: Combat effects sync with narration

## Description

In combat right now, the narration messages ("Lambert used Tackle!", "Rockitten took 12 damage!", "Rockitten fainted!", "Lambert gained 30 XP!") are paced out one-per-second by `CombatScene` while the entire turn — every HP change, XP award, status flip, faint — has already been applied to the model the moment the player picked an action. The HP bar visibly snaps to its final value before the first message even appears; the XP bar fills before the "you won" line; the DP pip drains a full second before "X Dark Power spent" shows up. This is jarring.

This story changes the engine so that each visible effect (HP drop, XP fill, status icon, DP pip change, faint, sprite swap) becomes visible **at the moment its narration line plays** — not at the start of the turn. The combat machine should compute the *sequence* of model mutations at turn-resolution time but defer applying them, and the combat scene's narrator should apply each mutation in lockstep with its corresponding message + HUD tween.

## Context

### Upstream's pattern — one action at a time, interleaved with text and HP tween

Upstream Tuxemon avoids this problem by structurally never building a "whole turn's events" list. Each phase tick pops one `EnqueuedAction` from `ActionQueue`, resolves it, animates it, narrates it, **waits for that to finish**, and only then pops the next one.

- `upstream/tuxemon/combat/action_queue.py:76-180` — `ActionQueue` holds an ordered list of `EnqueuedAction(user, method, target)`. The combat state machine sorts the queue once per turn and pops actions off as the ACTION phase ticks.
- `upstream/tuxemon/states/combat_state.py:346-353` — `handle_action_queue` is the heart of the pattern:

  ```python
  def handle_action_queue(self) -> None:
      """Take one action from the queue and do it."""
      if not self.combat_session.action_queue.is_empty():
          action = self.combat_session.action_queue.pop()
          self.perform_action(action.user, action.method, action.target)
          self.task(self.check_party_hp, interval=1)
          self.task(self.animate_party_status, interval=3)
          self.notifier.trigger_xp_and_wait_for_input(self.text_area)
  ```

  One action is popped, `perform_action` mutates the model (calls `apply_technique` → `tech.use` which writes `defender.current_hp`) and enqueues a `text_anim` for the dialog. **At `interval=1` second**, `check_party_hp` runs and calls `animate_hp` on every monster, which schedules an HP-bar tween (`combat_animations.py:293-305`). So the model mutation happens immediately, but the HP-bar tween starts at the same tick as the dialog alert text — they're visually simultaneous, and the next action can't fire until the in-flight text + animations clear.
- `upstream/tuxemon/states/combat_state.py:554-708` — `perform_action` / `_handle_monster_technique`. Note `text_anim.add_text_animation(partial(self.dialog.alert, message, self.text_area), action_time)` at L683-685 — the dialog isn't shown immediately, it's *enqueued* with a delay matching the action time. The next pop can't proceed until that text-anim task completes.
- `upstream/tuxemon/combat/session.py:566-582` — `apply_technique` mutates the model synchronously. The visual lockstep comes from one-action-at-a-time popping plus animation scheduling, **not** from deferred mutation.
- `upstream/tuxemon/states/combat_animations.py:293-362` — `animate_hp` and `animate_exp` tween the bars over 0.7 s using `out_quint` easing, scheduled into the same animation pool the text-anim system waits on.
- `upstream/tuxemon/states/combat_state.py:935-994` — `check_party_hp` is the post-action sweep that triggers HP-bar tweens, applies tick statuses, and handles faint/XP-award. It runs *after* each individual `perform_action`, not at the end of the turn.

The takeaway: upstream's HUD never gets ahead of the narration because the turn isn't pre-resolved — each action mutates the model *as* its message is enqueued, and the next action waits for the in-flight text + tween to clear.

### Our turn resolution today — everything applied before narration begins

- `src/game/combat/machine.ts:133-248` — `submitAction` builds the entire turn's `CombatEvent[]` synchronously: DP drain (L210-214), player attack (L215, calls `performAttack` → `executeTechnique`), enemy attack (L225), end-of-turn status ticks (L236), faint handling + XP award (L217, L226-241, `handleEnemyFaint` at L272-300). Every one of these branches calls into code that mutates the model immediately.
- `src/game/combat/techniqueExecutor.ts:45-72` — `executeTechnique` runs each effect in order. Damage effects write `defender.currentHp = Math.max(0, defender.currentHp - damage)` at L88. Status effects mutate `target.status` via `applyStatus`. Heal effects mutate `target.currentHp`. Stat-stage effects mutate `target.statStages[...]`. All before the event is pushed into the returned list.
- `src/game/combat/machine.ts:403-435` — `awardXp` calls `this.player.addXp(xp)` immediately (L413), processing level-ups and learned moves as model mutations, then pushes events describing what happened. Same pattern: mutate then describe.
- `src/game/combat/machine.ts:210-214` — DP drain: `this.darkPower = Math.max(0, this.darkPower - technique.dpCost)` happens *before* the `dp_drain` event is pushed.
- `src/game/combat/machine.ts:319-361` — items: `applyItemEffect` mutates HP on heal/revive before pushing `item_heal` / `item_revive` events.
- `src/game/combat/statusHandler.ts` — status apply / tick mutate `monster.status` immediately.

### Our narration loop today — paced display reading an already-resolved model

- `src/game/scenes/CombatScene.ts:1596-1601` — `queueEvents` appends events into `this.eventQueue` and kicks `processNextEvent`.
- `src/game/scenes/CombatScene.ts:1603-1661` — `processNextEvent`: pops one event, sets `messageText` to `event.message`, calls `updateHpBars()` + `updateDpPips()` (both of which read the *current model state*), schedules `time.delayedCall(1000, ...)` and loops.
- `src/game/scenes/CombatScene.ts:1461-1468` — `updateHpBars` reads `this.machine.player.currentHp / maxHp` and snaps the bar (`setScale`) every time it's called. **There's no tween**. Because the model already holds the post-turn values, the first call (on the *first* event of the turn, e.g. "5 Dark Power spent!") snaps both bars to their final values immediately.
- `src/game/scenes/CombatScene.ts:1476-1484` — `updateDpPips` does the same for the Dark Power pips, snapping to `this.machine.darkPower` which was already decremented.
- `src/game/scenes/CombatScene.ts:1532-1574` — `updatePartyTray` likewise re-reads model state to redraw party icons (alive vs fainted).
- There is **no XP-bar tween** in `CombatScene` today (no `xpFill` / `xpBar` field — XP is awarded silently in the model and only narrated via the "gained N XP" message).

### Where to make the cut

The dividing line is right at the boundary between `machine.ts` (mutates + describes in one pass) and `CombatScene.processNextEvent` (paces + redraws from current model). Each `CombatEvent` today carries only a `type` + `message`. To get effects in lockstep with narration, each event needs to carry *both* the description (what to show) **and** the mutation (what to apply to the model when this step plays). The narrator runs the mutation and the HUD tween at the moment it reveals the text, and the machine no longer mutates at action-submit time.

## Hypothesis

**H1 (likely):** Extend `CombatEvent` so each entry carries an optional `apply: () => void` (or `applyToModel: () => void`) callback alongside its `type`/`message`. The machine no longer mutates the model when computing events — instead, for each event, it captures a closure that performs the mutation (e.g. `() => { defender.currentHp = Math.max(0, defender.currentHp - damage); }`). `CombatScene.processNextEvent` calls `event.apply?.()` at the moment it shows the message, then animates the HUD (HP-bar tween, XP-bar fill, DP pip drain, faint sprite fade, etc.) before stepping to the next event 1 s later.

This minimises plumbing: the existing event shape grows one optional field, the existing per-event 1 s pace loop becomes the action-queue drain. Downstream branches that read model state during turn resolution (e.g. "did the enemy faint? → emit faint event") need to instead read against a *projected* model state — easiest approach is to compute the resulting HP/XP/status numbers up-front, hold them as locals, and have each event's `apply` closure write them back into the monster.

**H2 (alternative, lighter):** Keep events as plain `{type, message}` and change `machine.submitAction` to return a sequence of "stages", each containing `(events_for_this_stage, mutate_after_stage)`. `CombatScene` plays each stage's events with the current pace, then runs `mutate_after_stage` between stages. Simpler bookkeeping but coarser granularity — it's hard to make HP-drop visible at the "took N damage" message specifically rather than "after the attack mini-batch".

**H3 (closer to upstream):** Make `submitAction` build only the *first* action's events + mutation, then have `CombatScene` re-call into a `machine.continueTurn()` step after each batch finishes, mimicking upstream's pop-one-action-at-a-time pattern. Bigger refactor; only justified if H1's closures get unwieldy.

**Recommendation:** Start with H1. Fall back to H3 if `apply` closures end up tangled (e.g. if one event's mutation needs to read fresh model state set by an earlier event — closures handle that naturally as long as they read at call time, not capture time).

The implementor chooses; the goal stands either way: **HP/XP/status/DP/faint/sprite changes happen at the same step as their narration line, not before**.

## What to build

1. **Extend `CombatEvent` in `src/game/combat/machine.ts:22-54`** with an optional `apply?: () => void` field (or equivalent — name is bikeshed). Document in a comment that this closure mutates the live model and is invoked by the narrator at the moment the corresponding `message` is displayed.

2. **Refactor turn resolution in `src/game/combat/machine.ts:133-248` (`submitAction`)** plus its helpers (`performAttack`, `processItemAction`, `processCaptureAction`, `awardXp`, `tickEndOfTurn`, `handlePlayerFaint`, `handleEnemyFaint`) so they:
   - Compute the outcome numbers (damage, healed HP, XP gained, level-up details, status changes, faint status) up front — same math as today.
   - **Do not** write those numbers into `Monster.currentHp` / `Monster.totalXp` / `Monster.status` / `this.darkPower` directly during turn resolution.
   - For each event, attach an `apply` closure that performs the mutation when called. Closures capture the target monster + the computed delta and do the assignment at narration time. Example:
     ```ts
     {
       type: "damage",
       message: `${defender.name} took ${damage} damage!`,
       apply: () => { defender.currentHp = Math.max(0, defender.currentHp - damage); },
     }
     ```
   - Branches that today read post-mutation model state to decide what to emit next (e.g. `if (this.enemy.currentHp <= 0) handleEnemyFaint(...)`) need to instead reason about the *projected* post-event state. Easiest pattern: track running totals in local variables (`let enemyHp = this.enemy.currentHp; enemyHp -= damage; if (enemyHp <= 0) ...`) and decide branching from those, then bake the same totals into the per-event closures.
   - Make sure `executeTechnique` in `src/game/combat/techniqueExecutor.ts` either returns mutation-free `ExecutorEvent`s + delta info (`amount`, `target`) that the machine wraps with closures, or returns events that already carry the `apply` closure. The former is cleaner — `ExecutorEvent` already has `amount` / `effectiveness` fields ready for this.
   - Dark Power: the `dp_drain` event's `apply` closure does `this.darkPower = Math.max(0, this.darkPower - cost)`.
   - Status ticks (`tickEndOfTurn` → `statusHandler.tickStatuses`): same treatment — compute the tick, attach an `apply` closure, don't mutate yet.
   - Capture: `processCaptureAction` already builds events for each shake; the success branch's `apply` should run `onCapture(this.enemy)` at the moment "Gotcha!" displays, not before.
   - XP / level-up: the `xp_gain` event's `apply` calls `this.player.addXp(xp)`. Each subsequent `level_up` event's `apply` is a no-op (the addXp already promoted the monster — the trick is that the *xp_gain* event's apply produces all the level-up effects atomically, then the `level_up` and `move_learned` events just narrate). Alternatively, split it: `xp_gain.apply` only credits XP up to the next level cap; each `level_up.apply` actually steps the level. Pick whichever is simpler — the implementor's call.

3. **Rework `CombatScene.processNextEvent` in `src/game/scenes/CombatScene.ts:1603-1661`** to drain the queue with mutation + animation per step:
   - At the top of the function, after popping the event and setting `messageText`, call `event.apply?.()`.
   - Replace the existing `updateHpBars()` snap with an HP-bar **tween** for whichever bar(s) changed. Animate `playerHpBar.scaleX` / `enemyHpBar.scaleX` to the new ratio over ~400-700 ms with an out-quint or similar ease — matches upstream's 0.7 s. Update the colour at the end of the tween, or smoothly via `onUpdate`.
   - Same for DP pips on `dp_drain` events: tween the pip's alpha/colour, or at minimum snap-after-message-appears instead of snap-before.
   - If an XP bar exists (verify in `src/game/scenes/CombatScene.ts:200-220` — today there's no `xpBar` field, only HP bars), an XP bar may need to be added if the user expects the XP fill to be visible. **Scope check:** the user's example mentions XP — but if there's no XP bar today, adding one is a follow-up; the principle for now is "the `xp_gain` event's *message* and *model mutation* happen at the same step". Confirm with the implementor's reading of the scene whether an XP bar exists; if not, file a follow-up and limit this story to HP/DP/status/faint sync.
   - On `faint` events, the existing `updatePartyTray` call still works — just move it to fire **after** `event.apply()` (which will have set `target.fainted = true`), and consider a brief sprite fade-out tween before advancing.
   - The 1 s `delayedCall` to advance pacing stays — but ideally it waits for the longer of (1 s, tween-duration). Keep it simple if tweens are <= 1 s.

4. **Update unit tests under `src/__tests__/`** that pin the current "submitAction mutates immediately" semantics:
   - `src/__tests__/machine.test.ts:34-44` — `"fight deals damage to both sides..."` asserts `enemy.currentHp < enemy.maxHp` immediately after `submitAction`. Under the new model, that assertion fails because mutations are deferred. Update the test to either: (a) run a helper that drains the returned events' `apply` callbacks, then assert; or (b) assert against a per-event payload (e.g. `events.find(e => e.type === "damage")?.amount > 0`). Option (a) is closer to what the scene does. Add a small test helper `drainEvents(events: CombatEvent[])` next to the tests that loops `for (const e of events) e.apply?.()`.
   - Survey `src/__tests__/combat-items.test.ts`, `formula.test.ts`, `statuses.test.ts`, `statStages.test.ts`, `trainer-battle.test.ts`, `swap.test.ts`, `xp.test.ts`, `capture.test.ts` for the same pattern. Anywhere a test reads `monster.currentHp` / `monster.status` / `monster.totalXp` / `machine.darkPower` after a `submitAction` call, route it through the drain helper.
   - Add new tests proving the contract: `events[i].apply` exists where required; `enemy.currentHp` is **unchanged** after `submitAction` returns; after draining only the events up to (but not including) the `damage` event, `enemy.currentHp` is still pre-damage; after draining the `damage` event, it has dropped by the expected amount. Cover the analogous case for XP and DP.

5. **Add puppeteer QA script `qa/local/combat-effects-sync.ts`** using the state-snapshot approach (see QA Validation below).

6. **Add a small debug bridge helper** to `src/game/debug.ts` if needed:
   - `submitCombatAction(action): CombatEvent[]` already exists (declared in `qa/harness.ts:73` as returning `{type, message}[]`) — the type stripping drops the `apply` closure, which is fine; the QA script doesn't need to *call* the closure, it just needs to know whether the model has been mutated yet.
   - Add `peekCombatModel(): { playerHp, enemyHp, darkPower, playerXp, playerLevel, playerFainted, enemyFainted, activePlayerSlug, ... }` that returns a snapshot of the live model from the active `CombatScene.machine`. This lets the QA script assert "after submit, before drain, HP is unchanged" and "after step N of drain, HP has dropped".
   - Add `drainNextCombatEvent(): { type: string; message: string } | null` that pops one event from the scene's `eventQueue` and runs the same logic `processNextEvent` would (apply mutation, kick HUD tween, return). This lets the QA script step the narrator one event at a time and snapshot between steps, dodging the 1 s timing dependence. Mark it as QA-only in the debug bridge.

## Engine-side considerations

- **Faint mid-turn.** Today, if player KO's enemy on the player's swing, `submitAction` returns early via `handleEnemyFaint` and the enemy's counter-attack is skipped. Under the new design, the *enemy*-faint decision still has to be made during turn-resolution (so we know whether to enqueue the enemy's attack events or not). Use the projected-HP local-variable pattern: decide branching from `let projectedEnemyHp = ...; if (projectedEnemyHp <= 0) handleEnemyFaint(...)`. The `apply` closure for the damage event writes that same value into `enemy.currentHp`. **The faint event's mutation must run after the damage event's mutation** — natural since they're in queue order.
- **Status ticks (poison/burn/etc.) at end of turn.** Today computed + applied in `tickEndOfTurn` (`machine.ts:469-478` → `statusHandler.tickStatuses`). Same treatment: compute the tick damage, attach `apply` closures, decide post-tick faint from projected HP.
- **Status apply chance / accuracy / crit / miss.** All RNG rolls still happen at turn-resolution time so the narration order is deterministic. The RNG seed for damage/miss/status-apply is locked in when `submitAction` is called — `apply` closures must not re-roll.
- **Crit / effectiveness / no-effect branches** today push extra narration events (`miss`, `effectiveness` — `techniqueExecutor.ts:57-99`) — they remain `{type, message}` with no `apply` (no model mutation accompanies the "It's super effective!" line; the damage event already carries the multiplier-affected number).
- **Dark Power deduction visibility.** The `dp_drain` event is currently emitted *before* the player_attack event, and `machine.ts:210` mutates DP before pushing the event. Under the new design, both events get `apply` closures and the DP-pip visual drains at the moment the "5 Dark Power spent!" line shows — which is what the player expects.
- **Sprite swap / swap-in / swap-out events.** Today the swap mutates `this.player` before pushing the events (`machine.ts:175-179`). The `apply` closure on the `swap_in` event should perform the `this.player = target` assignment, and `CombatScene` already runs `updatePlayerSprite()` / `updateEnemySprite()` on `swap_in` (L1626-1630) so the sprite swap is already gated on narration — but the model's `this.player` pointer needs to be deferred so the *previous* player's HP bar is still showing as the "come back!" line plays.
- **Capture flow.** `onCapture(this.enemy)` adds the monster to the player's party. Under the new design, this should fire at the "Gotcha!" event's `apply`, not when `submitAction` returns.
- **State machine transitions.** Today `this.state = "ACTION" | "DECISION" | "END" | "FORCE_SWAP"` are flipped during `submitAction`. The transition to `DECISION` (or `END` / `FORCE_SWAP`) at the *end* of the turn happens before any narration plays. Today `CombatScene.processNextEvent` only checks `this.machine.state` *after* the queue is drained (L1607-1615), so behavioural impact is small — but: an `END` outcome (win/lose/fled) shouldn't be set on the machine until the `apply` closure of the last event runs, otherwise external code (e.g. `start_battle` event action waiting on outcome) could observe a finished battle before the player sees the "you won" message. Defer state transitions into `apply` closures too, or accept that machine.state flips early and only the *visible* effects are gated (probably fine — confirm with the implementor).
- **`debugSetEnemyHp` and other debug shortcuts** in `src/game/debug.ts:495-501` mutate the model directly. These are out-of-band — they don't go through events. Leave them as-is; they're QA tools and bypassing the queue is the intent.
- **`debugBridge.emit` calls.** The machine fires `debugBridge.emit("combat_state", {...})`, `debugBridge.emit("xp_gained", ...)`, `debugBridge.emit("level_up", ...)` (`machine.ts:411, 419, 430`) during turn resolution. These need to move into the corresponding event's `apply` closure (or fire alongside the narration, not at submit time) so that QA scripts subscribed to those events see them in lockstep with the on-screen narration.
- **Tests pinning current behaviour.** Specifically known affected: `src/__tests__/machine.test.ts:34-44, 96-102` and likely much of `combat-items.test.ts` / `xp.test.ts` / `capture.test.ts`. Plan to add a `drainEvents` helper used across the suite.

## QA Validation

Add `qa/local/combat-effects-sync.ts` (gitignored — it's a one-off verification script for this story; if the implementor wants to promote it to the curated suite later, that's a follow-up).

State-snapshot approach (preferred over frame-timing, per the planning prompt — frame-grab timing during a 1 s message-pace window is too flaky):

1. Launch the game, `setupGame()`, then `await page.evaluate(() => window.A!.spawnBattle("budaye", "rockitten", 5, 5, "grass"))`. Wait for the intro narration to clear.
2. Capture `before = window.A.peekCombatModel()` — enemy HP, player HP, Dark Power, etc.
3. Submit a fight action via `window.A.submitCombatAction({ type: "fight", technique: "scratch" })`. This now returns the event list **without mutating the model**. Immediately re-snapshot `afterSubmit = peekCombatModel()` and assert it equals `before` (HP unchanged, DP unchanged, etc.).
4. Loop: `for (let i = 0; i < events.length; i++) { window.A.drainNextCombatEvent(); snapshot = peekCombatModel(); }` — capture the snapshot at each step and the event type at that step.
5. Assert the expected step→delta map:
   - At the `dp_drain` step: Dark Power decreased.
   - At the `player_attack` step ("Budaye uses Scratch!"): enemy HP **still equal to `before`** (no damage applied yet — the message just announced the attack).
   - At the `damage` step ("Rockitten took N damage!"): enemy HP has dropped by `events[damageIdx].amount`.
   - At the `enemy_attack` step: player HP still equal to `before` (or equal to its previous step's value, since enemy attack damage hasn't been narrated yet).
   - At the `damage` step that follows enemy_attack: player HP has dropped.
6. Repeat with a KO scenario: `setEnemyHp(1)`, submit fight, drain. Assert the enemy's `currentHp` is still `1` after the `dp_drain` step, drops to `0` only at the damage step, and only at the `faint` step does the enemy's `fainted` flag flip. At the `xp_gain` step, `player.totalXp` jumps; at the `level_up` step (if any), `player.level` increments.
7. Repeat with a swap scenario: `setMonsterHp(0, 1)`, fight to faint, force_swap. Assert the `swap_in` event's `apply` is what flips `machine.player` (snapshot the active player's slug before vs after that specific step).
8. Optional: one screenshot `combat-effects-synced.png` captured mid-narration (e.g. immediately after step `player_attack`, before stepping to `damage`) for human eyeballing — the HP bar should still be full at that moment. Not asserted in code (timing fragile), purely visual.

If the implementor picks H2 / H3 (no per-event `apply` closure), the `drainNextCombatEvent` helper still works — it just advances one stage/action at a time — and the assertions are reframed against stage boundaries instead of event boundaries. The state-snapshot principle is the same.

## Out of scope

- Damage / XP / accuracy / catch-rate formulas. Numbers stay identical.
- New animations or hit flashes. If we want a screen-shake or hit-flash, that's a future story.
- The Dark Power *earn* flow / math-quiz recharge. This story only touches the *spend* visibility.
- Combat AI behaviour. The enemy's technique pick stays as-is.
- HUD layout / colours / fonts. Visual only changes by virtue of the new tweens; geometry is unchanged.
- Adding a separate XP bar widget if one doesn't already exist. If the implementor finds no XP-bar field in `CombatScene`, scope to HP/DP/status/faint sync and file a follow-up story for an XP bar.

## Acceptance Criteria

- [ ] `CombatEvent` (or the chosen equivalent shape) carries enough information for the narrator to apply the model mutation at the moment the message displays — verified via a new unit test that asserts `enemy.currentHp` is unchanged immediately after `submitAction` returns and only drops after the corresponding `apply` callback (or stage drain) runs.
- [ ] `CombatScene.processNextEvent` runs the mutation and triggers an HP-bar / DP-pip / faint / sprite visual update **at the same step as the corresponding narration message**, not on the first event of the turn.
- [ ] HP-bar transitions are tweened (~400-700 ms) rather than snapping. DP pips visibly drain on the `dp_drain` step.
- [ ] Faint, status-tick, miss, crit / effectiveness, and KO mid-turn cases all still narrate correctly with effect timing matching the message.
- [ ] `qa/local/combat-effects-sync.ts` exists and asserts: (a) model unchanged after `submitCombatAction` returns; (b) HP drops only at the damage step, not earlier; (c) XP / level-up / DP / faint each take effect at their narration step; (d) at least one KO + level-up path verified end-to-end.
- [ ] Unit tests under `src/__tests__/` that previously asserted post-submit model state have been migrated to either drain events first or assert against event payloads. No test regressions.
- [ ] `npm run format:check && npm run lint && npx tsc --noEmit && npm test` all pass.
