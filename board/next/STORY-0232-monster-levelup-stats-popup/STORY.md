# STORY-0232: Monster level-up stats popup

## Description

When a battle ends and a player monster has gained one or more levels, show
upstream's "level-up summary" modal so the player can actually see what
happened: monster name, the level transition (e.g. `Lv.8 → Lv.9`), each of
the six stats with `OLD → NEW (+DELTA)`, and an `OK` button that dismisses
the popup. This makes the otherwise-invisible level-up event feel weighty —
which matters extra in Arithmon because the player has just worked through
math problems to drive that battle. See `upstream-levelup-popup.png` for the
visual spec (LAMBERT Lv.8 → Lv.9, six-row stat table, `► OK`).

## Context

- Visual spec: `upstream-levelup-popup.png` (this directory).
- **Upstream popup state**: `upstream/tuxemon/states/level_up.py:19-90`
  (`LevelUpSummaryState`). It's a PygameMenu modal with three sections:
  - name label (uppercase, medium font),
  - `Lv.{start} → Lv.{end}` subtitle (small),
  - one label per stat: `STATNAME: old → new (+delta)` (uppercase, small),
  - an `OK` button that calls `client.pop_state()` to dismiss.
- **Upstream stat collection**: stats are diffed across the whole XP grant,
  not per individual level. `upstream/tuxemon/monster/monster.py:603-649`:
  `set_level()` snapshots `_levelup_start_stats` on the *first* level-up in
  a grant and `_levelup_end_stats` on every subsequent one; then
  `consume_levelup_summary()` returns a single `(start_level, end_level,
  diff)` tuple covering the whole jump. So if a monster goes Lv.5 → Lv.7 in
  one battle, upstream shows **one** popup with `Lv.5 → Lv.7` and the
  combined stat delta — not two popups. Mirror this.
- **Upstream trigger sites** (both push the popup the same way):
  - `upstream/tuxemon/states/combat_state.py:858-880` — after combat ends,
    loops `rewards.winners` and pushes one `LevelUpSummaryState` per
    monster that levelled, with `task(..., interval=4.5)` so popups are
    spaced out and sequenced.
  - `upstream/tuxemon/event/actions/give_experience.py:80-92` — out-of-
    combat XP grants (e.g. event scripts) push the popup too, gated by a
    `trigger_ui` flag.
- **Our XP / level-up site**:
  - `src/game/combat/machine.ts:403-435` — `CombatMachine.awardXp()` is the
    only XP grant in our codebase. It runs after enemy faint
    (`handleEnemyFaint`, line 277) and after a successful capture
    (`processCaptureAction`, line 386). It pushes a `level_up` CombatEvent
    (and one per-level emission on `debugBridge.emit("level_up", …)`) but
    those events only carry a `message` string today — there is no popup.
  - `src/game/model/Monster.ts:134-182` — `Monster.addXp()` loops
    `levelUp()` for each level crossed; each `LevelUpResult` already
    contains `{ newLevel, oldStats, newStats, newMoves }` (see
    `MonsterStatsSnapshot` at line 11). That gives us everything we need —
    but the loop emits one result per level. The popup wants the COMBINED
    diff across all levels gained from a single `awardXp()` call (upstream
    semantics — see above).
- **Our combat-end flow**:
  - `src/game/scenes/CombatScene.ts:1603-1661` — `processNextEvent()` walks
    the `CombatEvent` queue; when empty and `machine.state === "END"` it
    calls `showEndMessage()`.
  - `src/game/scenes/CombatScene.ts:1817-1843` — `showEndMessage()` prints
    the win/lose/fled string then `delayedCall(2000, …)` stops the scene
    and resumes `OverworldScene`. This is where we splice the popup(s) in:
    after the end message, before the delayed return.
- **Popup template / chrome precedent**: `src/game/scenes/MonsterInfoScene.ts`
  is the closest existing modal to mirror:
  - It's a top-launched scene (not pause/resume) — `scene.launch(...)` in
    `src/game/debug.ts:535-538`, registered in `src/game/main.ts:52`.
  - It dims the parent (`add.rectangle(... 0x000000, 0.85)`, line 104).
  - Uses `addText` + the `BODY`/`NAME`/`SMALL`/`SMALL_HEADING` styles from
    `src/game/ui/textStyle.ts`.
  - Dismiss uses the polled-key + `prevKeys` rising-edge pattern (lines
    63-67, 120-126, 141-149, 254-260); registers ESC / X / B / BACKSPACE /
    SPACE. Re-use the same pattern in the new scene; `OK` should respond
    to **ENTER and SPACE** (kid-friendly confirm keys — match the rest of
    our UI; see `MonsterInfoScene.ts:67,125` for the SPACE precedent and
    `STORY-0228` for the rationale).
- **Stat-name delta**: our internal fields are `armor`, `melee`, `ranged`,
  `dodge`, `speed`, `maxHp` (see `src/game/combat/statStages.ts:14`,
  `src/game/model/Monster.ts:11-18`). Upstream's visual labels are
  `ARMOUR`, `DODGE`, `HP`, `MELEE`, `RANGED`, `SPEED` (alphabetical, all
  uppercase). The popup MUST display upstream's labels (the screenshot is
  the spec). Map `maxHp → "HP"` and `armor → "ARMOUR"` (British spelling
  per upstream) in the popup's own label table; do NOT rename the model
  fields.
- **Debug helpers we already have**:
  - `window.A.setMonsterXp(index, xp)` —
    `src/game/debug.ts:503-512` — sets a party monster's total XP and
    drives `addXp(0)` until level-up processing completes. This is enough
    to test the post-battle path: pre-set the XP so the player monster
    will tip over a level boundary on the *next* `awardXp` call.
  - `window.A.spawnBattle(playerSlug, enemySlug, pl, el, env)` and
    `window.A.setEnemyHp(0)` (lines 423, 495) — used today in
    `qa/combat-recharge-math.ts:63,82` to spin up a deterministic battle
    and one-shot the enemy.
  - `window.A.waitForEvent("level_up")` and `("scene_started")` —
    `src/game/debug.ts:459-473`. The machine already emits `"level_up"` on
    the bridge (`machine.ts:419`). We will *additionally* emit a
    `"levelup_summary"` event from the new popup scene so QA can wait on
    the modal opening (see "Engine-side considerations").

## What to build

1. **New scene** `src/game/scenes/LevelUpPopupScene.ts`, modeled on
   `MonsterInfoScene.ts`:
   - Constructor key `"LevelUpPopupScene"`.
   - `init(data: LevelUpPopupSceneData)` where data is
     `{ monsterName: string; startLevel: number; endLevel: number;
        diff: { armor: [number, number]; dodge: [number, number];
        maxHp: [number, number]; melee: [number, number];
        ranged: [number, number]; speed: [number, number]; };
        onDismiss?: () => void; }`.
     Pass the *raw* before/after pairs; the scene computes deltas itself.
   - `create()`:
     - Dim parent: `add.rectangle(0, 0, SCREEN_W, SCREEN_H, 0x000000, 0.6)`
       (lighter dim than MonsterInfo's 0.85 — popup sits OVER the live
       combat-end screen and upstream's panel doesn't fully blot out the
       battlefield; tune in QA against the upstream screenshot).
     - Centered panel ~120×100 design-px, cream fill + dark border. Use a
       `Phaser.GameObjects.Rectangle` (or a 9-slice if we already have
       one — check `src/game/ui` first; if not, two stacked rectangles is
       fine — keep it simple). Match the panel-chrome aesthetic used
       elsewhere in `src/game/scenes/` (Bag/Shop/Pause); copy whichever's
       cleanest.
     - Rows, from top:
       - Monster name uppercase using `NAME` style (`textStyle.ts`).
       - `Lv.X → Lv.Y` using `SMALL_HEADING` or `SMALL`.
       - Six stat rows, alphabetical (ARMOUR, DODGE, HP, MELEE, RANGED,
         SPEED), each rendered as `STATNAME: OLD → NEW (+DELTA)` with the
         delta sign rendered as `+` for positive (per upstream
         `level_up.py:77-79`; deltas are always ≥ 0 because base stats
         never go down on level-up). Use a fixed-pitch column layout — pad
         the label and OLD/NEW columns so the arrows align vertically
         (upstream's font is monospaced; ours isn't — left-align labels at
         one X, right-align the OLD value at a second X, the arrow + NEW
         at a third). Eyeball against `upstream-levelup-popup.png`.
       - An `► OK` row at the bottom, slightly highlighted, with the
         leading `►` chevron drawn the same way the combat menu cursor is
         (look at `CombatScene.ts` cursor handling — re-use the glyph).
   - Input handling — same polled-key pattern as `MonsterInfoScene`:
     - Register ENTER (13) and SPACE (32) as confirm keys.
     - Also accept ESC (27) / X (88) / B (66) / BACKSPACE (8) as dismiss
       (every modal in the game already does this; consistency > strict
       upstream fidelity).
     - On confirm/dismiss: stop the scene and invoke `onDismiss?.()` to
       hand control back to the caller (CombatScene).
   - Emit `debugBridge.emit("scene_started", { scene: "LevelUpPopupScene",
     monster: monsterName, startLevel, endLevel })` on create and
     `scene_stopped` on shutdown, mirroring `MonsterInfoScene.ts:133-138`.
     Also `getDebugState()` returning `{ levelUpPopup: { monsterName,
     startLevel, endLevel } }` so QA can inspect.
   - Register in `src/game/main.ts` next to `MonsterInfoScene` (line 52).

2. **Aggregate before/after stats across all levels gained in one
   `awardXp()` call**, then attach the summary to the existing `level_up`
   CombatEvent so the scene can pick it up:
   - In `src/game/model/Monster.ts:134`, change `addXp` so it ALSO returns
     a single aggregated summary alongside the per-level `LevelUpResult[]`
     (or just expose `oldStats` of the first call + `newStats` of the
     last). The cleanest shape:
     ```ts
     interface LevelUpSummary {
       startLevel: number;
       endLevel: number;
       oldStats: MonsterStatsSnapshot;
       newStats: MonsterStatsSnapshot;
       newMoves: TechniqueDef[];
     }
     addXp(amount: number): { levelUps: LevelUpResult[]; summary: LevelUpSummary | null }
     ```
     `summary` is `null` if no level was gained.
   - In `src/game/combat/machine.ts:413`, switch to the new return shape.
     Keep the existing per-level `level_up` CombatEvent (it's what drives
     the "X grew to Lv N!" message in the dialog band — keep that for
     continuity), but extend `CombatEvent` (line 22-54) to carry an
     optional `levelUpSummary?: LevelUpSummary` payload. Stamp the
     aggregated summary onto the LAST `level_up` event in the run so
     CombatScene can grab it when it dequeues that event. Alternatively,
     emit a new `level_up_summary` CombatEvent type — pick whichever the
     implementor finds cleaner, but DO NOT push two summary popups for the
     same monster.
   - Today only the active player monster ever earns XP (single-monster
     award — see `machine.ts:413` where it's hard-coded to `this.player`).
     One summary per `awardXp()` call → one popup per battle, max. Note
     this in the file; upstream supports multi-monster XP because trainer
     battles can XP-share, but we don't yet — call it out as a TODO so
     future multi-XP work knows where to wire in additional popups.

3. **Splice the popup into the post-battle flow** in
   `src/game/scenes/CombatScene.ts`:
   - Pick where to fire the popup. The cleanest spot is **after** the
     "You won!" message in `showEndMessage()` (line 1817), **before** the
     `delayedCall(2000, …)` that stops the scene. Capture the latest
     `LevelUpSummary` on the scene (set it when dequeuing the `level_up`
     event in `processNextEvent`, around line 1633 where it currently
     calls `this.updateNameLabels()`).
   - Rough flow:
     1. `processNextEvent` sees the (last) `level_up` event, stashes the
        attached summary on the scene as `this.pendingLevelUpSummary`.
     2. `showEndMessage` runs as today (prints win/lose/fled).
     3. After ~1 second (let the win message read), if
        `pendingLevelUpSummary` is set, `scene.launch("LevelUpPopupScene",
        { ...summary, monsterName, onDismiss: () => continueReturn() })`.
        Otherwise skip straight to today's behaviour.
     4. `continueReturn()` does what today's `delayedCall(2000, …)` does:
        `scene.stop("CombatScene"); scene.resume("OverworldScene")`.
   - The popup BLOCKS the post-battle return — control resumes only after
     OK. This matches upstream's `interval=4.5` cadence in spirit (popup
     interrupts the return) without us building a separate scheduling
     mechanism.
   - On lose / fled outcomes, no popup (no level-up happens on a loss; on
     flee no XP was awarded).

4. **Puppeteer QA** — new file `qa/levelup-popup.ts` (checked in — this
   is permanent regression coverage, not throwaway):
   - `setupGame(page)` with the default `budaye L5` party.
   - Pre-load the monster's XP to one short of the L5→L6 threshold via
     `window.A.setMonsterXp(0, xpForLevel(6) - 1)`. (Import the same
     formula? Easier: hard-code the delta and read `state.party[0].totalXp`
     after to assert. Or use the simpler approach: `setMonsterXp(0,
     xpForLevel(6) - 10)` and let a small XP yield from one battle tip it
     over.) The implementor decides; goal is a deterministic level-up.
   - `spawnBattle("budaye", "rockitten", 5, 2, "grass")` for a low-XP
     opponent the player will trivially win.
   - One-shot with `setEnemyHp(0)` + `submitCombatAction({ type: "fight",
     technique: <slug> })` (or just `setEnemyHp(0)` then any attack — see
     `qa/combat-recharge-math.ts:82` for the pattern).
   - `waitForEvent("scene_started", "LevelUpPopupScene")` (the popup
     emits this on create). Take `screenshot(page, "levelup-popup")`.
   - Assert via `getState()` / `getDebugState()` that
     `levelUpPopup.monsterName === "Budaye"` and `endLevel === 6`.
   - Dispatch `keydown` Enter (keycode 13). Wait a tick. Assert popup is
     gone (`scene_stopped` event or active-scene check). Screenshot
     `levelup-popup-dismissed.png` (optional — only if it shows a
     meaningful "popup closed, back to overworld" frame; otherwise drop).
   - Reviewer compares `qa/screenshots/levelup-popup.png` to
     `upstream-levelup-popup.png` for chrome / layout / stat-row fidelity.
   - **Optional multi-level scenario** (only add if time permits):
     pre-set XP so one battle tips over TWO levels (L5 → L7), assert
     `startLevel === 5 && endLevel === 7` in a SINGLE popup. This is the
     primary upstream-fidelity check and is cheap to add — recommended.

## Engine-side considerations

- **Multi-level → ONE popup.** Upstream collapses N levels gained from a
  single XP grant into one summary popup (see
  `upstream/tuxemon/monster/monster.py:603-649` and
  `upstream/tuxemon/states/level_up.py:69-79` — the subtitle is `Lv.
  start → Lv. end`, one row per stat with the cumulative delta). We
  mirror this. Per-level dialog messages ("X grew to Lv N!") still fire
  for each level — only the popup is collapsed.
- **Multi-monster.** Today only `this.player` (the active monster) gains
  XP — `machine.ts:413` is hard-coded. Single popup per battle is the
  correct ceiling for current code. Leave a `// TODO: multi-monster
  popups when XP-share is added` comment at the splice site so future
  work knows where to extend.
- **Stat-name delta.** Our model fields: `armor`, `melee`, `ranged`,
  `dodge`, `speed`, `maxHp`. Popup display labels (per upstream
  screenshot): `ARMOUR`, `DODGE`, `HP`, `MELEE`, `RANGED`, `SPEED`,
  alphabetical. Map in the popup scene only; don't touch the model.
- **Returning control to the post-battle flow.** The popup's `onDismiss`
  callback is responsible for triggering `scene.stop("CombatScene") +
  scene.resume("OverworldScene")` — replicating today's `delayedCall`
  behaviour at `CombatScene.ts:1839-1842`. Move that two-line teardown
  into a private `returnToOverworld()` method so both the
  popup-dismissed path and the no-levelup path share one exit. If outcome
  is `lose`/`fled`, `returnToOverworld()` is called directly (no popup).
- **Evolution chaining.** Upstream's `set_level` sets
  `waiting_to_evolve = true` and a separate state pushes the evolution
  prompt elsewhere (`upstream/tuxemon/states/evolution.py:108`). Our
  evolution path is an event-script action
  (`src/game/event/actions/evolution.ts`) that runs in cutscenes — not
  chained to combat at all today. So level-up popup → no evolution prompt
  in our codebase, which is fine. Out of scope.
- **Stat recompute.** Already correct — `levelUp()` in
  `Monster.ts:145-182` recomputes all six stats with the level-aware
  scale. We only need to snapshot BEFORE the first level-up and AFTER the
  last one in the run, then diff.
- **Don't double-pop the popup.** If the implementor chooses the
  "stamp summary onto the last `level_up` event" approach (step 2), be
  careful when N≥2 levels are gained: stamp ONLY the last per-level
  event, not all of them, so `processNextEvent` doesn't try to launch
  the scene twice.
- **Input-blocking while popup is up.** Phaser auto-blocks input on
  inactive scenes — `MonsterInfoScene` already relies on this; same
  pattern works here. No extra plumbing needed.

## QA Validation

Add `qa/levelup-popup.ts` (checked in; this is the regression target).
Outline above. Reviewer should:

1. `npx tsx qa/levelup-popup.ts` exits 0.
2. `qa/screenshots/levelup-popup.png` exists and visually matches
   `upstream-levelup-popup.png` in: centered modal, monster name header
   uppercase, `Lv.X → Lv.Y` subtitle, six-row stat table alphabetically
   ordered with `OLD → NEW (+DELTA)` per row, `► OK` affordance at the
   bottom. Acceptable deviations: panel chrome, font (we use our pixel
   font, not pygame_menu's), background dimming intensity.
3. Manual sanity (Puppeteer or local browser): spawn a battle, win it,
   dismiss the popup with Space — game returns cleanly to the overworld.

## Out of scope

- Changes to XP / level-curve formulas (`src/game/combat/formula.ts`).
- Changes to stat-computation math (`Monster.levelUp` scale function).
- Evolution prompts post level-up. Our evolution path is decoupled from
  combat (event-script action) — separate concern. Note the upstream
  chaining in the plan but don't implement it.
- XP-bar fill animation between win message and popup. We don't have one
  today; upstream does (`combat_state.py:898-903 animate_exp`). Leave for
  a future story.
- Multi-monster popup queueing — currently only the active monster gets
  XP. Add a TODO comment but don't build queue logic yet.
- Translation strings — the popup labels (`ARMOUR`, `DODGE`, `HP`, etc.)
  can be hard-coded strings in this scene. Upstream uses `T.translate("ok")`
  etc.; we'll wire i18n in a later story if needed.

## Acceptance Criteria

- [ ] After a battle in which the player's monster levels up at least once,
      a centered modal popup appears showing the monster name, `Lv.X →
      Lv.Y`, six stat rows (ARMOUR / DODGE / HP / MELEE / RANGED / SPEED)
      each with `OLD → NEW (+DELTA)`, and an `► OK` affordance.
- [ ] `OK` (ENTER or SPACE) dismisses the popup; ESC / X / B / BACKSPACE
      also dismiss for UX consistency with other modals.
- [ ] After dismissal, control returns to the overworld (same teardown as
      today's `delayedCall` in `CombatScene.showEndMessage`).
- [ ] If the monster gains 2+ levels in one battle, ONE popup appears
      showing the combined `Lv.start → Lv.end` and the cumulative stat
      delta (upstream-fidelity behavior — verified by
      `upstream/tuxemon/monster/monster.py:603-649`).
- [ ] No popup on lose / flee outcomes.
- [ ] New scene `LevelUpPopupScene` exists at
      `src/game/scenes/LevelUpPopupScene.ts`, registered in
      `src/game/main.ts`, and emits `scene_started` / `scene_stopped`
      events on the debug bridge.
- [ ] `Monster.addXp` returns a `LevelUpSummary | null` aggregate (or
      equivalent — implementor's choice) covering the whole XP grant.
- [ ] `qa/levelup-popup.ts` checked in; runs end-to-end and produces
      `qa/screenshots/levelup-popup.png`. The screenshot visually matches
      `upstream-levelup-popup.png` in layout (centered modal, name +
      Lv.X→Y header, six-stat table with deltas, OK affordance).
- [ ] `npm run format:check && npm run lint && npx tsc --noEmit && npm test`
      all pass.
