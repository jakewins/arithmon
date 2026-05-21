# STORY-0215 Journal

## What was wrong

`public/assets/events/spyder_omnichannel1.yaml` had drifted from upstream's
`spyder_omnichannel1.tmx` in several ways. The user-named symptom was the
kick-out guard never re-encountering the player: `Spot Enforcer` ended with
`set_variable hospitalcure:yes` — a flag upstream only sets inside the hospital
cure quest (`spyder_candy_hospital3.tmx`). Flipping it inside the HQ cutscene
both (a) made the `not variable_set hospitalcure:yes` guard skip on re-entry
and (b) silently advanced downstream content (six `hospitalcure` conds on
`spyder_routec.tmx` plus reads in `spyder.yaml` and the hospital itself).

The story called for a full re-port pass on the file rather than a one-line
patch, since several other divergences were nearby.

## What changed

### YAML (`public/assets/events/spyder_omnichannel1.yaml`)

- **`Spot Enforcer`** (the user-named bug). Removed `set_variable hospitalcure:yes`
  and the trailing redundant `unlock_controls`. Added `char_stop player` as
  the first action (matches upstream `act01`) so the player can't keep walking
  mid-cutscene. Reordered the lock/unlock pair to match upstream: lock at
  start, unlock right after `pathfind enforcer,3,12`, then the dialog /
  face / pathfind-player / remove-npc actions run with controls already
  unlocked (which is fine — `pathfind` drives sprites directly regardless of
  the controls lock).
- **`Battle Enforcer`** + **`Enforcer Post Battle`**. Collapsed into a single
  linear event mirroring upstream `act01..act60`. `start_battle` is already
  multi-frame and resumes the action chain on `CombatScene` shutdown (see
  `src/game/event/actions/startBattle.ts:103-127`), so the upstream "dialog
  → battle → dialog → pathfind → remove" sequence Just Works. Added the
  missing `not char_defeated player` condition (upstream `cond3`). Kept our
  inline English dialog text (`"I told you before - scram!"` /
  `"It is I who must scram!"`) — matches the upstream `.po` strings verbatim.
  Per Arithmon convention, omitted the upstream `add_monster rabbitosaur,35,
  spyder_omnichannel_enforcer,...` line; the static party definition in
  `src/game/data/npcParties.ts:109-113` already covers it.
- **`Set Environment`**. Replaced the dead `omnichannel1_env:yes` variable
  shim with proper `set_environment interior` / `not environment_is interior`.
  Both engine handlers already existed (`setEnvironment.ts`, `environmentIs.ts`).
- **`Threats`**. Ported the missing random-encounter event (gated on
  `omnichannel1wall:yes` + `check_char_parameter player,moving,1`). The
  `omnichannel1wall` flag is set in the omnichannel2 puzzle (unported), so
  this event is dormant in our build today — but it'll come alive cleanly
  the moment omnichannel2 lands.
- **`Create Screen`** + **`Pass1`**. Ported. The screen NPC is a static prop
  at (7,18). The blocker is the existing `key=screen` collision rect in our
  map JSON, not the prop itself, so we don't need `remove_collision` to make
  the screen physically block traffic today. Pass1 plays the upstream
  "Screen active!" dialog when the player tries to interact with it.
- **TODO comment for `Remove Screen`**. See engine deferral below.
- **TODO comment for music slug**. `music_omnichannel` vs `music_cathedral_theme`
  is still out of scope — `play_music` is a no-op logger.

### Engine

- **`checkCharParameter`** (`src/game/event/conditions/checkCharParameter.ts`).
  Added a `moving` case so `check_char_parameter player,moving,1` evaluates
  `ctx.playerMoved` — the per-frame "transitioned to a new tile" flag.
  Mirrors upstream's per-step poll, which is what gates the Threats event.

### Data

- **`encounters.ts`**. Ported the upstream `spyder_omnichannel` encounter
  table (`dark_robo` and `xeon_2`, both already in our monster registry,
  L30-31, equal weight) from `upstream/mods/tuxemon/db/encounter/spyder_omnichannel.yaml`.

## Engine pieces deferred

- **`remove_collision <key>`**. Upstream `Remove Screen` (object id 51)
  drops the `key=screen` collision rect once the omnichannel2 puzzle is
  solved. Our `OverworldScene` builds collision rects from the Tiled
  `Collisions` object layer without keeping a key→rect index — adding one
  is a couple-tens-of-lines refactor (track keys when building both the
  physics body and the A\* `walkGrid`, then expose `removeCollisionByKey`
  on the scene for the action to call). Out of scope for this story since
  (a) the gating flag `omnichannel1wall:yes` is set nowhere in our codebase
  yet, (b) the wall puzzle lives in omnichannel2 which is unported, and (c)
  the story explicitly authorizes deferring this. Suggested follow-up:
  `STORY-XXXX-remove-collision-action` — port alongside or just before
  omnichannel2.

## QA

Extended `qa/cotton-omnichannel-kickout.ts` with the STORY-0215 second-visit
assertion: after the first kick-out lands the player back in cotton_town,
direct-teleport back to (2,12) facing up and assert (a) the enforcer cutscene
fires again, (b) the enforcer NPC ends up at (3,12), (c) the player gets
teleported back to cotton_town a second time, and (d) `hospitalcure` is
**not** `"yes"` either time (regression check for the user-named bug).

Screenshot `qa/screenshots/cotton-omnichannel-kickout-revisit.png` shows the
enforcer (knight sprite) standing next to the player at (3,12) mid-dialog on
the second visit — visible proof the guard is back.

Also smoke-tested the `Create Screen` event via `qa/local/check-screen.ts`
(throwaway): the `spyder_screen` static prop spawns at (7,18) as expected.

## Pre-commit gates

`npm run format:check && npm run lint && npx tsc --noEmit && npm test` — all
green (465 tests, 42 files).

---

## 2026-05-21 — Reviewer findings (approve)

### Validated

- All five acceptance criteria met:
  - `Spot Enforcer` drops `set_variable hospitalcure:yes`; `char_stop player` is first action. Confirmed via diff and upstream TMX (object id 32) cross-check.
  - `Battle Enforcer` + `Enforcer Post Battle` collapsed into one linear event with `not char_defeated player`; order matches upstream `act01..act60`.
  - `Set Environment` now uses `set_environment interior` / `not environment_is interior` (was dead `omnichannel1_env:yes` shim).
  - `Threats` event ported, gated on `omnichannel1wall:yes` + `check_char_parameter player,moving,1`.
  - `Create Screen` and `Pass1` ported; `Remove Screen` cleanly deferred with TODO — acceptable since `omnichannel1wall:yes` is set nowhere in the codebase yet.
- Dialog strings cross-checked against `upstream/mods/tuxemon/l18n/en_US/LC_MESSAGES/base.po`: `"Butt out of it, kid, this is private property!"`, `"I told you before - scram!"`, `"It is I who must scram!"` all match verbatim.
- Encounter table (`dark_robo`, `xeon_2`, L30-31, weight 0.5 each) matches `upstream/mods/tuxemon/db/encounter/spyder_omnichannel.yaml` exactly.
- `checkCharParameter` `moving` case is minimal and correct — delegates to `ctx.playerMoved`, mirrors upstream per-step poll.
- Pre-commit gates re-run independently: `format:check`, `lint`, `tsc --noEmit`, `npm test` (465 tests, 42 files) — all green.
- QA script `qa/cotton-omnichannel-kickout.ts` executed with `ARITHMON_PORT=8082`: first kick-out, `hospitalcure` regression check, second-visit re-encounter assertion — all passed. Screenshot `cotton-omnichannel-kickout-revisit.png` confirms enforcer NPC visible at (3,12) during second-visit dialog.
