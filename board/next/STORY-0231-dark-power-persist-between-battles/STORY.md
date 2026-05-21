# STORY-0231: Dark Power persists between battles

## Description

Today, every combat starts at full Dark Power (`MAX_DARK_POWER = 5`) — the
counter is reset when each `CombatMachine` is constructed. That undercuts the
core Arithmon loop: a player who burned all their DP and fled (or won) a hard
fight should still be empty going into the next encounter, forcing them to
choose Recharge and solve a math problem. Move Dark Power state from the
per-battle `CombatMachine` onto the player (`session.player`) so the value
carries over between battles. New games still start full; the value just stops
being clobbered on each fresh `CombatScene`.

## Context

- `MAX_DARK_POWER = 5` and `darkPower: number = MAX_DARK_POWER` are declared on
  `CombatMachine` itself — `src/game/combat/machine.ts:56-72`. Every
  `new CombatMachine(...)` therefore boots back to full. The constructor does
  not take a starting DP argument (`src/game/combat/machine.ts:75-91`).
- The only construction site outside tests is `CombatScene.init` at
  `src/game/scenes/CombatScene.ts:375-383`, called whenever the overworld
  launches a `CombatScene` (e.g. `OverworldScene.debugSpawnBattle` at
  `src/game/scenes/OverworldScene.ts:1055-1081`, plus the regular trainer /
  wild battle entry points).
- DP is mutated in two places: spend on attack
  (`src/game/combat/machine.ts:210`, inside `submitAction`) and refill on a
  correct math answer (`CombatScene.onRecharge` at
  `src/game/scenes/CombatScene.ts:1568-1592` calling
  `machine.rechargeDarkPower()` at `src/game/combat/machine.ts:101-103`).
- Player/session state lives in `src/game/session.ts`. `PlayerState`
  (`session.ts:11-19`) currently holds `name`, `gender`, `template`,
  `monsters`, `inventory`, `money`, `gameVariables` — adding `darkPower` here
  matches the rest of "stuff the player owns across scenes".
- Save/load: `src/game/save.ts:26-44` defines `SaveData.player` and
  `saveGame()` at `src/game/save.ts:92-121` serialises money, monsters,
  inventory, variables. `loadGame()` restores them at lines 176-195. Adding
  `darkPower` to the saved player keeps it persistent across reloads with
  one tiny addition each side; the save `version` is already `1`, no bump
  needed (missing field on old saves can default to `MAX_DARK_POWER`).
- The debug bridge already exposes a `darkPower` field but it's wired to the
  wrong source: `src/game/debug.ts:216` reads `session.skillEncounter` (the
  encounter counter, not DP). This looks like a stale placeholder — once DP
  lives on the player, point this getter at `session.player.darkPower` so QA
  scripts can read the overworld-resident value without having a
  `CombatScene` active.
- Existing tests poke `machine.darkPower` directly (e.g.
  `src/__tests__/machine.test.ts:96-121`); they must keep working. As long as
  `CombatMachine` still defaults DP to `MAX_DARK_POWER` when no override is
  passed, every existing test (which constructs the machine directly without
  going through `CombatScene`) continues unchanged.

## Hypothesis

Smallest change that does the job:

1. Add `darkPower: number` to `PlayerState`, initialised to `MAX_DARK_POWER` in
   `createSession()` and `resetSession()`.
2. Give `CombatMachine` an optional `initialDarkPower` constructor argument;
   keep the default as `MAX_DARK_POWER` so existing tests are untouched.
3. In `CombatScene.init`, pass `session.player.darkPower` as the initial value
   when constructing the machine.
4. On battle end (the same `showEndMessage` / shutdown path that calls
   `scene.stop("CombatScene")` at `CombatScene.ts:1839-1842`), write
   `this.machine.darkPower` back to `session.player.darkPower`. Do it from a
   point that fires for all three outcomes (`win`, `lose`, `fled`) — the
   simplest spot is just before `scene.stop` in `showEndMessage`, or in a
   `this.events.once("shutdown", ...)` handler so it runs even if shutdown
   happens by some other path.
5. Save/load: include `darkPower` in the serialised `player` block. Default to
   `MAX_DARK_POWER` for old saves that lack the field.
6. Fix the bogus `darkPower: session.skillEncounter` in the debug snapshot
   (`src/game/debug.ts:216`) so QA can read the persistent value.

## What to build

1. **Promote DP to PlayerState.**
   - In `src/game/session.ts`, add `darkPower: number` to `PlayerState`
     (`session.ts:11-19`) and initialise it to `MAX_DARK_POWER` inside
     `createSession()` (`session.ts:117-148`). Import `MAX_DARK_POWER` from
     `./combat/machine` (the constant is already exported on line 56).
     `resetSession()` automatically picks up the new default because it calls
     `createSession()`.

2. **Plumb the value through `CombatMachine`.**
   - Add an optional `initialDarkPower?: number` parameter to the
     `CombatMachine` constructor (`machine.ts:75-91`); default to
     `MAX_DARK_POWER`. Assign it to `this.darkPower` instead of the inline
     field initialiser.
   - Leave `maxDarkPower` alone — it's still the cap.

3. **Read on battle start, write on battle end.**
   - In `CombatScene.init` (`CombatScene.ts:375-383`), pass
     `session.player.darkPower` as the new `initialDarkPower` arg.
   - In `CombatScene` register a `this.events.once("shutdown", ...)` handler
     in `create()` (alongside the existing shutdown handler at lines 716-718)
     that does `session.player.darkPower = this.machine.darkPower`. Using
     `shutdown` rather than `showEndMessage` covers all exit paths
     (`win`, `lose`, `fled`, and any future debug teardown) with one write.

4. **Save/load.**
   - In `src/game/save.ts`:
     - Add `darkPower: number` to `SaveData.player` (line ~28-36).
     - Serialise `darkPower: p.darkPower` in `saveGame()` (`save.ts:96-104`).
     - In `loadGame()` (`save.ts:176-195`) set
       `p.darkPower = data.player.darkPower ?? MAX_DARK_POWER` so saves
       written before this change still load. Import `MAX_DARK_POWER` from
       `./combat/machine`.
   - No `version` bump — the back-compat default covers older saves.

5. **Fix the stale debug snapshot.**
   - In `src/game/debug.ts:216`, replace
     `darkPower: session.skillEncounter,` with
     `darkPower: session.player.darkPower,`. This makes
     `window.A.getState().session.darkPower` actually reflect Dark Power so
     the new QA script (and any future scripts) can read it from outside
     combat.

6. **QA script.**
   - Add `qa/local/dark-power-persist.ts` (gitignored local script — this is a
     one-shot persistence assertion, not a long-lived regression). Flow
     described in the QA Validation section below.

7. **Unit test (cheap).**
   - Add one test to `src/__tests__/machine.test.ts` (or a new tiny file,
     reviewer's call) that constructs `new CombatMachine(player, enemy,
     undefined, undefined, true, undefined, undefined)` with the new
     `initialDarkPower` arg set to `2` and asserts `machine.darkPower === 2`.
     This locks in the new constructor contract.

## Engine-side considerations

- The DP HUD reads `this.machine.darkPower` directly (`CombatScene.ts:1478`,
  `1004`, `1082`, `1570`). After the change, the machine still owns the live
  in-battle copy — only the seed at construction and the writeback at
  shutdown reference `session.player`. The HUD code does not need to change.
- The math-quiz "Recharge" path calls `machine.rechargeDarkPower()`
  (`CombatScene.ts:1580`), which sets `darkPower = maxDarkPower` on the
  machine. The shutdown writeback then carries the refilled value back to the
  player — no extra wiring needed.
- DP is clamped to `[0, maxDarkPower]` inside `CombatMachine` already
  (`machine.ts:210` uses `Math.max(0, ...)`; refill is bounded by setting to
  `maxDarkPower`). Writing back as-is is safe.
- The save format change is additive and back-compat — old saves keep
  loading by falling back to `MAX_DARK_POWER`. Do **not** bump
  `SaveData.version`.

## QA Validation

Add `qa/local/dark-power-persist.ts` (gitignored, throwaway-suitable). Use the
existing `qa/harness.ts`, `setupGame`, and `spawnBattle` debug-bridge calls.
Model the structure on `qa/combat-recharge-math.ts` — in particular reuse its
`getCombatState`/active-scene-vs-debug-bridge pattern, since the bridge's
active-scene pointer is unreliable across scene transitions.

Steps:

1. `launchGame()` + `setupGame(page)` (defaults are fine — paper_town with one
   L5 budaye).
2. `await page.evaluate(() => window.A!.spawnBattle("rockitten", "rockitten",
   5, 5, "grass"))` — start the first battle.
3. Wait until `CombatScene` menuMode is `"main"` (same pattern as
   `combat-recharge-math.ts` lines 64-71).
4. Drain DP to `2` by directly setting `combat.machine.darkPower = 2` (same
   pattern as `combat-recharge-math.ts` lines 74-83 — direct mutation via the
   scene reference). Also `window.A!.setEnemyHp(1)` so the next player attack
   one-shots the enemy.
5. Assert `getCombatState(page).darkPower === 2` (sanity).
6. Win the battle: open Fight, pick the cheapest 1-DP move (e.g. `scratch`
   isn't on rockitten; use `ram` and accept it costs 2 — adjust monster slugs
   if needed so the final DP after the killing blow is non-zero, e.g. use
   `budaye` vs a 1-HP enemy and a 1-DP move). Reviewer: pick whichever
   monster/move combination is easiest; the assertion only cares that DP at
   battle-end is a known non-default value (not 0, not 5).
7. Wait for `CombatScene` shutdown — `await page.waitForFunction(() =>
   window.A!.getState().scene === "OverworldScene", ...)`.
8. Read `window.A!.getState().session.darkPower` (now backed by
   `session.player.darkPower` after the fix in step 5 of "What to build").
   Assert it equals the value at the end of battle 1 (e.g. `1` if a 1-DP move
   landed the kill from `darkPower = 2`).
9. `spawnBattle` a second time. After menuMode is `"main"`, assert
   `getCombatState(page).darkPower` equals that same end-of-first-battle
   value — **NOT** `5` (which would be the old behaviour).
10. Take one screenshot at the start of battle 2 named
    `dark-power-persist-battle-2.png` so a human reviewer can eyeball the DP
    pips visually showing the carry-over (1 lit, 4 dark, or whatever value
    you carried over).
11. As a final assertion, win/flee the second battle and confirm
    `session.darkPower` again matches the post-battle-2 machine value.

If during implementation it turns out `spawnBattle` doesn't return cleanly
without a real opponent death (e.g. flee mechanics make the assertion flaky),
fall back to manipulating `machine.outcome` directly via the scene reference
and calling `this.machine.state = "END"` — keep the helper local to the QA
script, don't add a new debug bridge method.

No new permanent QA file is needed — this is a single behavioural check
covered well by `qa/local/`.

## Out of scope

- Changing how DP is earned/spent (the math quiz still gives a full refill;
  attacks still cost their per-technique `dpCost`).
- Reworking the math problem UI or scoring.
- Save-file format `version` bump — the change is back-compat with a default.
- Cross-character DP (NPC trainers having persistent DP pools) — only the
  player has DP.
- Persisting DP across "New Game" — `resetSession()` already wipes the
  player block, so a fresh game gets `MAX_DARK_POWER` for free.
- Changing the DP cap (`MAX_DARK_POWER = 5` stays).
- Any visual indication on the overworld that DP is currently below max (no
  HUD outside combat today; not adding one here).

## Acceptance Criteria

- [ ] `session.player` has a `darkPower: number` field, initialised to
      `MAX_DARK_POWER` in `createSession()`.
- [ ] `CombatMachine` accepts an optional `initialDarkPower` constructor arg
      that defaults to `MAX_DARK_POWER`; existing direct-construction call
      sites (tests) still produce machines with DP = 5.
- [ ] `CombatScene.init` seeds the machine with `session.player.darkPower`,
      and `CombatScene` writes `machine.darkPower` back to
      `session.player.darkPower` on shutdown for all outcomes
      (`win` / `lose` / `fled`).
- [ ] Save/load round-trips `darkPower` on the player; old saves without the
      field default to `MAX_DARK_POWER`.
- [ ] `window.A.getState().session.darkPower` reflects
      `session.player.darkPower` (the stale `skillEncounter` wiring is gone).
- [ ] `qa/local/dark-power-persist.ts` passes: ending battle 1 with
      `darkPower = N` results in battle 2 starting at `darkPower = N`, and
      `session.darkPower` between battles matches that same value.
- [ ] `npm run format:check && npm run lint && npx tsc --noEmit && npm test`
      all pass.
