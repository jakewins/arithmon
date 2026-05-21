# STORY-0215: Omnichannel HQ event-script divergences from upstream

## Description

Our port of Omnichannel HQ floor 1 (`public/assets/events/spyder_omnichannel1.yaml`) diverges from upstream's `spyder_omnichannel1.tmx` in several ways that break story progression. The user-reported symptom is that **the kick-out guard never re-encounters the player** after their first visit: walk in once, get kicked out, walk in a second time, no guard. The root cause is that our `Spot Enforcer` event sets `set_variable hospitalcure:yes` at the end of the cutscene — but in upstream this variable is set far away in `spyder_candy_hospital3.tmx` (the hospital cure quest), and `Spot Enforcer` only **reads** it as a gate. We're prematurely flipping a story-quest flag inside an enforcer cutscene, which both (a) lets the player skip the guard on re-entry and (b) likely unlocks downstream content elsewhere (`spyder_routec.tmx` has six conditions on `hospitalcure:yes`).

The user also asked for a sanity-check of the rest of the file. There are several other divergences (some likely incidental, some likely engine-side polish that's still wrong); the ones that genuinely affect gameplay are bundled into this story. Fix-everything-in-one-go is the right move because the file is small (~150 lines) and an implementor reading upstream once can address them all in a single pass.

## Context

- Upstream map source: `upstream/mods/tuxemon/maps/spyder_omnichannel1.tmx` (the TMX `<object type="event">` blocks are the source of truth)
- Our port: `public/assets/events/spyder_omnichannel1.yaml`
- `hospitalcure:yes` upstream lifecycle:
  - **Set** in `upstream/mods/tuxemon/maps/spyder_candy_hospital3.tmx:128` (`act30: set_variable hospitalcure:yes`) as part of the hospital cure quest.
  - **Read** in `spyder_omnichannel1.tmx:128` (Spot Enforcer gate), `spyder_candy_hospital3.tmx` (multiple conds), `spyder.yaml:112,160`, and `spyder_routec.tmx` (six conds across the route). Setting it in HQ silently advances all of those.
- `omnichannel1wall:yes` upstream lifecycle:
  - **Set** in `spyder_omnichannel2.tmx:212` after the player solves the "screen" puzzle (cure).
  - **Read** to gate random encounters (`spyder_omnichannel1.tmx:195` Threats), screen-removal (`spyder_omnichannel1.tmx:209` Remove Screen + `:217` Pass1), and downstream maps `spyder_omnichannel3.tmx:178`, `spyder_omnichannel4.tmx:108`.
- Prior story for reference: `board/done/STORY-0207-omnichannel-hq-kickout/STORY.md` was the *engine* fix that made the kick-out pathfind onto the doormat tile actually work. This story is the *content* follow-up: the cutscene runs, but the variable accounting is wrong.
- Existing checked-in QA: `qa/cotton-omnichannel-kickout.ts` already covers the happy-path kick-out. We'll extend that (or add a sibling) to assert the **second**-visit re-encounter behavior.

## Divergences to fix

Each item below cites upstream lines (TMX) and our lines (YAML). Port upstream verbatim where there's no Arithmon-side reason to deviate.

### 1. `Spot Enforcer` sets `hospitalcure:yes` (the user-reported bug)

- Upstream `spyder_omnichannel1.tmx:115-132` (object id 32). Action list: `char_stop player`, `lock_controls`, `create_npc enforcer,8,7`, `pathfind enforcer,3,12`, `unlock_controls`, `char_face player,right`, `translated_dialog spyder_cottontown_enforcer`, `char_face player,down`, `pathfind player,2,13`, `remove_npc enforcer`. Conditions: `not variable_set hospitalcure:yes`, `is char_at player`.
- Ours `public/assets/events/spyder_omnichannel1.yaml:93-110`. Adds two trailing actions upstream does NOT have: `set_variable hospitalcure:yes` and `unlock_controls`. The `set_variable` is the gameplay-divergence bug. The trailing `unlock_controls` is moot because we never re-locked, but should be removed alongside.
- **Fix:** delete the `set_variable hospitalcure:yes` line. Also add `char_stop player` as the first action (matches upstream `act01`) so the player can't keep walking into the enforcer mid-cutscene. Keep the controls-lock-unlock structure aligned with upstream (lock at start, unlock after `pathfind enforcer,3,12`, then dialog/face/pathfind/remove run with controls already unlocked — see upstream act05).
- **Result:** the first time the player enters HQ they still get kicked out; on the second visit (before the hospital cure) `Spot Enforcer`'s condition still holds, so the cutscene fires again, matching upstream.

### 2. `Battle Enforcer` is incomplete and split across two events

- Upstream `spyder_omnichannel1.tmx:134-157` (object id 33) is one linear event: `char_stop`, `lock_controls`, `create_npc enforcer,4,3`, `pathfind enforcer,3,10`, `unlock_controls`, `char_face player,right`, `translated_dialog spyder_cottontown_enforcer1`, `add_monster rabbitosaur,35,spyder_omnichannel_enforcer,5,10`, `start_battle player,spyder_omnichannel_enforcer`, `translated_dialog spyder_cottontown_enforcer2`, `pathfind enforcer,2,12`, `remove_npc enforcer`. Conditions: `not battle_outcome player,won,spyder_omnichannel_enforcer`, `is char_at player`, `not char_defeated player`.
- Ours `public/assets/events/spyder_omnichannel1.yaml:112-135` splits this into `Battle Enforcer` (trigger → start_battle) plus a standalone `Enforcer Post Battle` event that has no trigger and relies on the global event loop re-running `is battle_outcome ... won && is char_exists enforcer`. That's not how upstream structures it, and it leaves a window where the player can move during the post-battle frame.
- **Fix:** collapse the two events back into one, matching upstream's action ordering. Replace the inline `"dialog Back again? ..."` with the same dialog text (we don't have to port `translated_dialog` lookups — keep the existing English strings, but inline them in the single event). Our engine's `start_battle` is multi-frame and resumes the action chain after CombatScene shuts down (see `src/game/event/actions/startBattle.ts:103-127`), so the upstream linear flow Just Works. NPC party data already lives in `src/game/data/npcParties.ts:109-113` (`spyder_omnichannel_enforcer` → rabbitosaur L35); the `add_monster` line from upstream is intentionally omitted in our convention. Delete the standalone `Enforcer Post Battle` event after merging.
- Also missing: `not char_defeated player` condition (cond3 upstream). Add it.

### 3. `Set Environment` uses an invented variable instead of `set_environment`

- Upstream `spyder_omnichannel1.tmx:90-94` (object id 29, "Environment"): `act1: set_environment interior`, `cond1: not environment_is interior`.
- Ours `public/assets/events/spyder_omnichannel1.yaml:10-14` invents a `omnichannel1_env:yes` variable that is read nowhere else in the codebase or upstream. Grep confirms it's dead.
- **Fix:** replace with `set_environment interior` / `not environment_is interior`. Our engine implements `set_environment` (see `src/game/event/actions/setEnvironment.ts`) and `environment_is`.

### 4. Missing `Threats` (random encounters) event

- Upstream `spyder_omnichannel1.tmx:193-198` (object id 48, "Threats" at tile (0,2) width=1): `act1: random_encounter spyder_omnichannel,0.6`, conds `is variable_set omnichannel1wall:yes` AND `is check_char_parameter player,moving,1`.
- Ours: completely missing.
- **Fix:** add a `Threats` global event mirroring upstream. The encounter table `spyder_omnichannel` exists in upstream at `upstream/mods/tuxemon/db/encounter/spyder_omnichannel.yaml`; the implementor should check whether we have a corresponding entry in our encounter registry, and if not, port it. (If porting the encounter table is non-trivial, add a TODO comment and gate the Threats event behind a stub — but encounters in dungeons are gameplay, so prefer porting.)

### 5. Missing `Create Screen` / `Remove Screen` / `Pass1` events

- Upstream `spyder_omnichannel1.tmx:200-219` (object ids 49, 51, 53):
  - **Create Screen** (cond `not omnichannel1wall:yes`, `not char_exists spyder_screen`) → `create_npc spyder_screen,7,18`.
  - **Remove Screen** (cond `is omnichannel1wall:yes`) → `remove_collision screen` — un-blocks the "screen" collision (the static collision object at TMX line ~28 with `key=screen`).
  - **Pass1** (cond `is char_facing_tile player`, `is button_pressed INTERACT`, `not omnichannel1wall:yes`) → `translated_dialog spyder_omnichannel1_screen` — the screen NPC's interact dialog.
- Ours: completely missing all three. This means the door/screen blocker that upstream uses to gate the northern half of HQ behind the cure quest is absent in our port.
- **Fix:** port the three events. For the Pass1 dialog, inline an English equivalent — match the upstream meaning (the screen rejects the player). Verify `remove_collision` is supported by our engine; if not, file a hypothesis in `JOURNAL.md` and gate behind a TODO without expanding scope beyond this story. The `spyder_screen` NPC slug must exist in our NPC registry; check `src/game/data/npcs.ts` (or equivalent) and add if missing using the upstream sprite (`upstream/mods/tuxemon/db/npc/spyder_omnichannel_npcs.yaml` and `upstream/mods/tuxemon/sprites/spyder_screen*.png` if present — or whichever sprite upstream uses). If the engine *or* asset side blocks a clean port, drop a clearly-labelled hypothesis in `JOURNAL.md` and **leave the events out**; do not invent fake versions. Removing the wall puzzle is preferable to fabricating one.

### 6. Music slug mismatch (low priority, mention but defer)

- Upstream uses `music_omnichannel`. Ours uses `music_cathedral_theme`.
- Music actions are stubbed in our engine (`src/game/event/actions/playMusic.ts` is a no-op logger), so this is purely cosmetic right now. **Out of scope** — but flagged in the YAML as a TODO comment so the next pass picks it up.

## Hypotheses worth knowing

- **`remove_collision` may or may not exist in our engine.** Upstream uses it in `Remove Screen`. If our engine doesn't implement it, the cleanest fix is to add it; if scope creeps, leave a TODO. Check `src/game/event/actions/` first.
- **`check_char_parameter player,moving,1`** is used by upstream Threats. Verify our engine supports it; if not, this is a one-line action handler to add.
- **`spyder_screen` NPC may not be registered.** Upstream's NPC YAML is at `upstream/mods/tuxemon/db/npc/spyder_omnichannel_npcs.yaml`; cross-reference with our NPC registry.

These are all "easy if supported, defer cleanly if not" items — don't expand the story to engine refactors, but do port the YAML actions verbatim when the engine already supports them.

## What to build

1. **Read upstream once end-to-end** (`upstream/mods/tuxemon/maps/spyder_omnichannel1.tmx`). The TMX `<object type="event">` blocks are the source of truth; everything else in this plan is just a roadmap.
2. **Audit our engine** for the actions/conditions the divergences need: `set_environment`, `environment_is`, `random_encounter`, `remove_collision`, `check_char_parameter`, `char_stop`. Note which are missing for the implementor's `JOURNAL.md`.
3. **Edit `public/assets/events/spyder_omnichannel1.yaml`** in one pass:
   - Drop `set_variable hospitalcure:yes` and the trailing `unlock_controls` from `Spot Enforcer`. Add `char_stop player` as the first action. Re-arrange lock/unlock to match upstream.
   - Collapse `Battle Enforcer` + `Enforcer Post Battle` into a single event matching upstream's action ordering. Add `not char_defeated player` condition.
   - Replace the `omnichannel1_env:yes` variable shim in `Set Environment` with `set_environment interior` / `not environment_is interior`.
   - Add the `Threats` event (gated on `omnichannel1wall:yes` + player moving).
   - Add `Create Screen`, `Remove Screen`, `Pass1` events (skip cleanly if the engine truly can't support them — see hypotheses).
4. **If `spyder_screen` NPC isn't registered**, add a minimal entry mirroring upstream's `db/npc/spyder_omnichannel_npcs.yaml`.
5. **Extend QA.** Add a second-visit assertion to `qa/cotton-omnichannel-kickout.ts` (or add a sibling `qa/cotton-omnichannel-revisit.ts` if that file feels overloaded): after the first kick-out, drive the player back into HQ via the south door and confirm the enforcer cutscene fires **again**. Screenshot the second-visit dialog so the reviewer can eyeball the guard's presence.
6. **Update `JOURNAL.md`** in the story directory with a one-paragraph summary of which divergences were fixed, which engine pieces (if any) were added, and any deferred items (with a follow-up story slug suggestion).

## Engine-side considerations

- The kick-out cutscene already works (STORY-0207). Don't regress its happy-path. The existing `qa/cotton-omnichannel-kickout.ts` is the gate.
- `start_battle` is multi-frame and resumes the action chain after CombatScene exits (see `src/game/event/actions/startBattle.ts:103-127`). The collapsed `Battle Enforcer` event relies on this — verify the chain actually resumes when re-running the script through Puppeteer.
- Our convention is to define NPC parties statically in `npcParties.ts` rather than via `add_monster` in YAML — that's intentional. When porting events that contain `add_monster` lines, **omit** them and confirm the static party entry covers the trainer (the Enforcer + William entries already exist).
- `set_environment interior` should not break anything visual — but check what our `setEnvironment.ts` does on transition (e.g. if it touches lighting/post-fx, the HQ may suddenly look different). If it does, that's *correct* upstream behavior; just spot-check the screenshot.
- If the engine doesn't support `remove_collision` cleanly, the Pass1/Create Screen/Remove Screen trio can be deferred to a follow-up story. The kickout fix and the `hospitalcure:yes` removal are independent of that work and must land regardless.

## QA Validation

This is user-visible cutscene behavior, so Puppeteer is mandatory. Two scripts:

1. **Extend `qa/cotton-omnichannel-kickout.ts`** (the existing checked-in script). After the existing kick-out flow lands the player in Cotton Town:
   - Drive the player back to the HQ south door (or use `teleport` to (2,12) facing up again — direct teleport is fine, the cutscene logic is the same).
   - Wait for the cutscene to fire. Assert the player is teleported back to Cotton Town **a second time**, mirroring upstream's "guard keeps kicking you out until you cure the hospital".
   - Capture a screenshot `cotton-omnichannel-kickout-revisit.png` showing the second-visit enforcer dialog. Reference it in `JOURNAL.md`.
   - Use the debug bridge to confirm `variables.get("hospitalcure")` is **not** `"yes"` after the kick-out (the regression check for the user-named bug).

2. **If the screen-puzzle events are ported**, add a small assertion (in the same script or `qa/local/`) that verifies the `spyder_screen` NPC exists in the world on first visit (cond `not omnichannel1wall:yes`) and that walking onto its tile is blocked by the `screen` collision. No screenshot needed — a state assertion is enough.

The reviewer should:
- Manually inspect `cotton-omnichannel-kickout-revisit.png` to confirm the enforcer is back on-screen.
- Re-grep for `hospitalcure` in our codebase and confirm the only place that **sets** it is the hospital cure quest (currently unported — so right now, nothing should set it).
- Spot-check `public/assets/events/spyder_omnichannel1.yaml` against upstream's TMX one more time for any divergence the implementor missed.

## Out of scope

- **Music slugs.** `music_omnichannel` vs `music_cathedral_theme` is cosmetic until we ship audio. Leave a TODO comment in the YAML but don't change the slug.
- **Translated-dialog ports.** Upstream uses `translated_dialog spyder_cottontown_enforcer` etc.; we use inline English strings. Keep the inline strings — porting `.po` lookups is a separate story (and our existing strings already cover the same beats).
- **Engine work beyond minor action handlers.** If `remove_collision`, `check_char_parameter`, or `set_environment` need substantial engine work to support, defer those YAML events behind a TODO and file follow-up stories. The `hospitalcure:yes` removal (the user-named bug) and the `Battle Enforcer` consolidation must land regardless.
- **Other Omnichannel floors** (`spyder_omnichannel2/3/4`). Out of scope; this story is floor 1 only.

## Acceptance Criteria

- [ ] `Spot Enforcer` in `public/assets/events/spyder_omnichannel1.yaml` no longer contains `set_variable hospitalcure:yes`. The trailing redundant `unlock_controls` is also removed; `char_stop player` is added as the first action.
- [ ] `Battle Enforcer` and `Enforcer Post Battle` are merged into a single event matching upstream's `act01..act60` ordering, including `not char_defeated player` as a third condition.
- [ ] `Set Environment` uses `set_environment interior` / `not environment_is interior` (no `omnichannel1_env` variable anywhere).
- [ ] `Threats` random-encounter event ported (gated on `omnichannel1wall:yes` + player moving), with the `spyder_omnichannel` encounter table available (or a clearly-flagged TODO if the table needs separate porting).
- [ ] `Create Screen`, `Remove Screen`, `Pass1` events ported — OR each unsupported event is gated behind a labelled TODO with a `JOURNAL.md` note explaining what's deferred and why. (Don't fabricate fake versions of the screen puzzle.)
- [ ] `qa/cotton-omnichannel-kickout.ts` extended (or sibling script added) to drive a **second** visit and assert the enforcer cutscene fires again — with `cotton-omnichannel-kickout-revisit.png` checked in and referenced in `JOURNAL.md`.
- [ ] After running the full QA, `session.variables.hospitalcure` is **not** `"yes"`. (Documented in `JOURNAL.md`.)
- [ ] `JOURNAL.md` lists each divergence, what was fixed, what was deferred, and the follow-up story slug for any deferral.
- [ ] `npm run format:check && npm run lint && npx tsc --noEmit && npm test` all pass.
