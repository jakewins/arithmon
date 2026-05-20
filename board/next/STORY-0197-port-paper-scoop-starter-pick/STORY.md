# STORY-0197: Port spyder_paper_scoop verbatim — CEO cutscene + "not Gold member" rejection

## Description

Port the `spyder_paper_scoop` map and its event YAML verbatim from upstream Tuxemon. This is the **first scoop visit** the player makes after the bedroom cinematic: the storekeeper greets them, the form-filling dialog runs (Dante walks down to the bins and back, name prompt fires), the player picks one monster from a `choice_monster` menu, NPCs choreograph an exit, and finally the storekeeper says "sorry, you're not a Gold member, go home" — then teleports the player back to `spyder_bedroom.tmx,3,4`.

**Important correction from the earlier draft of this story**: the prior planner asserted that the player's scoop-menu choice gets added to their party (acceptance criterion: "Chosen starter ends up in the player's party"). **That is wrong.** Upstream never adds the scoop choice to the player. The `myintrochoice` variable is recorded narratively — and used later when paper_town's `First Fight - Start` builds Billie's team via `add_monster billie_choice,5,spyder_billie,...`. The player's actual starter comes from the bins in paper_town (STORY-0196), not from the scoop menu.

The scoop also has post-intro NPCs (Dante wandering, shopkeeper at the counter) and a `Talk Dante No Party` event that sets `dantefirst:yes` — that flag is what gates STORY-0196's bin sequence. So the scoop is visited twice: once for the cutscene, once for the "talk to Dante to be told to look in the bins" beat.

**Depends on**: STORY-0195 (bedroom intro teleports the player to scoop at 4,8) and STORY-0201 (MonsterInfoScene for the CapDev bin journal-inspect events — though scoop's CapDev events only call `open_journal`, no choice prompt, so 0201 is a soft dep).

### Upstream reference

- `upstream/mods/tuxemon/maps/spyder_paper_scoop.tmx` — 13×11 outdoor back-of-store yard with bins. Collisions near the top (y=32-128) make the shopkeeper unreachable during the cutscene.
- `upstream/mods/tuxemon/maps/spyder_paper_scoop.yaml` — **the verbatim event script to port**. Our loader's YAML schema is compatible — `cp` should work.
- `upstream/mods/tuxemon/l18n/en_US/LC_MESSAGES/base.po` — dialog msgids:
  - `spyder_intro_shopkeeper1` / `2` / `3` / `4`
  - `spyder_intro_question_name`
  - `areyousure`
  - `potions_in_shop`
  - `spyder_papertown_danteresting`, `_danteworking`, `_dante1`, `_dante2`, `_dante3`

### Full event inventory (20 events in upstream)

Read `upstream/mods/tuxemon/maps/spyder_paper_scoop.yaml` directly — it's already structured as YAML in upstream, so this is closer to a literal copy than STORY-0196 (paper_town, where events live inside the TMX). Events:

- **Create NPCs** — spawns 7 NPCs in formation. Gated on `not intro_scoop:done` + all 7 `not char_exists` checks.
- **Create Shopkeeper** — post-intro, spawns shopkeeper at (0,4). Gated on `not char_exists spyder_shopkeeper` + `is variable_set intro_scoop:done`.
- **Create Dante** — post-intro, spawns Dante at (11,6) with `wander` behavior. Gated on `not char_exists spyder_dante` + `is variable_set intro_scoop:done`. Note: 4th arg `wander` — upstream `create_npc` accepts a behavior keyword in slot 4; our action treats slot 4 as a Direction (fix described below).
- **Route Music** — `play_music music_cathedral_theme`.
- **Intro Storekeeper** — the long opening choreography. Locks controls, dialog `_shopkeeper1`, Dante walks (7,7)→(5,3)→(5,4)→(5,5)→(5,6)→(5,7)→(5,8) facing left, dialog `_shopkeeper2` twice (once mid-walk, once at the bins), Dante walks back to (7,7), dialog `_question_name`, `rename_player player,random`, set `choice_phase:yes`, unlock. Gated on `not intro_scoop:done` + `not choice_phase`.
- **Choice** — `choice_monster budaye:dollfin:grintot:ignibus:memnomnom,myintrochoice` + `set_variable choice_phase:next`. Gated on `choice_phase:yes`.
- **Confirm Monster** — `translated_dialog_choice yes:no,areyousure`. Gated on `choice_phase:next`.
- **Confirm Monster No** — set `choice_phase:yes` + `areyousure:none` (re-opens the menu). Gated on `areyousure:no`.
- **Confirm Monster Yes** — set `choice_phase:progress`. Gated on `areyousure:yes`.
- **Billie Budaye / Dollfin / Grintot / Ignibus / Memnomnom** — five sibling events, each setting `billie_choice:<slug>` based on which `myintrochoice` was picked. These persist for paper_town's `First Fight - Start` event to read.
- **Continue Storekeeper** — the long exit choreography (40+ lines). Locks controls, dialog `_shopkeeper3`, each of the 5 background NPCs walks `(5,7)→(6,7)→(6,10)` and despawns, then player pathfinds to (6,7), Dante faces up, shopkeeper walks down to (6,6) and faces player, dialog `_shopkeeper4` ("not a Gold member, go home"), player pathfinds to (6,10), `transition_teleport player,spyder_bedroom.tmx,3,4,0.3`, remove shopkeeper + Dante, set `intro_scoop:done`, unlock. Gated on `not intro_scoop:done` + `choice_phase:progress`.
- **5 CapDev events** at (8,8) through (12,8), each `open_journal <slug>` on INTERACT — `dollfin`, `memnomnom`, `budaye`, `grintot`, `ignibus` (note ordering: (8,8)=dollfin, (9,8)=memnomnom, (10,8)=budaye, (11,8)=grintot, (12,8)=ignibus). **Always interactable**, including during the cutscene's gaps — these are flavor and never gate anything.
- **Potions** at (8,5) width 5 — sign showing `potions_in_shop` dialog on INTERACT.
- **Go Outside** at (6,10) — `transition_teleport player,spyder_paper_town.tmx,19,13,0.3`. Gated on `is char_at player` + `is char_facing player,down` + `is variable_set intro_scoop:done`. Note: **only works after the cutscene completes** — during the cutscene there's no way to leave the scoop on foot.
- **Talk Dante No Party** — `translated_dialog spyder_papertown_danteresting` + `set_variable dantefirst:yes`. `behav: talk spyder_dante`. Gated on `intro_scoop:done` + `not party_size > 0`. **Critical**: this event sets the flag that lets paper_town's bin-cutscene fire. The player has to physically come back to the scoop and talk to Dante to get past the Stop! blocker via the alternate route.
- **Talk Dante Party / Daycare / Omnichannel / Player Returns** — post-intro Dante dialogs gated on later campaign state. Port verbatim even though they don't fire during the intro.

### What to build

1. **Port the TMX map**
   - Export `upstream/mods/tuxemon/maps/spyder_paper_scoop.tmx` to our Tiled-JSON format (same procedure as STORY-0196). Preserve the upper-area collisions that make the shopkeeper unreachable during the cutscene. Register in `src/game/data/maps.ts`.
   - Copy any tileset PNGs not already in `public/assets/maps/`.

2. **Literal copy of the event YAML**
   - `cp upstream/mods/tuxemon/maps/spyder_paper_scoop.yaml public/assets/events/spyder_paper_scoop.yaml`. Do not hand-translate.
   - Our current `public/assets/events/spyder_paper_scoop.yaml` is divergent — **replace it entirely**.

3. **Register the 7 cutscene NPC sprites**
   - `spyder_shopkeeper`, `spyder_dante`, `spyder_papermart_miles`, `spyder_papermart_shirley`, `spyder_route2_roddick`, `spyder_papermart_harith`, `spyder_billie`.
   - Source PNGs: `upstream/mods/tuxemon/sprites/<slug>.png`. Apply `[[feedback_npc_registry_audit]]` (verify `sprite_name` vs upstream) and `[[feedback_npc_qa_dimension_check]]` (48×128 layout, byte-cmp vs upstream).
   - `spyder_billie` and `spyder_dante` may already be registered from STORY-0196 prep work — coordinate.

4. **Port required dialog msgids**
   - Append to `public/assets/l10n/en_US.po`: `spyder_intro_shopkeeper1` through `4`, `spyder_intro_question_name`, `areyousure`, `potions_in_shop`, all `spyder_papertown_dante*` strings referenced by post-intro Talk Dante events.

5. **Engine fix: `create_npc … ,wander`**
   - `Create Dante` calls `create_npc spyder_dante,11,6,wander`. Our `src/game/event/actions/createNpc.ts` parses arg[3] as a `Direction`. `"wander"` is a behavior keyword, not a direction.
   - Fix: if arg[3] is a known behavior keyword (`wander`, `path`, `none`), treat it as a behavior (acceptable initial: wandering is a no-op stub — Dante just stands there) and default facing to `down`. Don't crash on unknown args.

6. **Verify `choice_monster`, `rename_player`, `translated_dialog_choice` work in OverworldScene**
   - `rename_player` was previously used in cutscene contexts. The scoop cutscene runs inside `OverworldScene`. Confirm the rename UI overlay renders correctly here; if not, fix the action to work in both contexts.

### Engine notes

- All other actions used (`change_bg`, `lock_controls`/`unlock_controls`, `translated_dialog`, `pathfind`, `char_face`, `wait`, `transition_teleport`, `remove_npc`, `set_variable`, `open_journal`, `play_music`, `char_stop`) are registered.
- All conditions used (`variable_set`, `char_exists`, `music_playing`, `char_at`, `char_facing`, `char_facing_tile`, `char_facing_char`, `button_pressed`, `party_size`, `battle_outcome`) are registered.

### Keep `setupGame()` working

`setupGame()` currently sets `intro_scoop:done` so QA teleporting to scoop skips the cutscene. After this story:
- Verify the gating conditions in `Intro Storekeeper`, `Create NPCs`, `Choice`, `Continue Storekeeper`, etc. actually read `intro_scoop:done` and `choice_phase` per the verbatim YAML.
- Once `intro_scoop:done`, `setupGame` should also set `choice_phase:progress`, `billie_choice:<slug>`, `myintrochoice:<slug>` matching the monster it gives the player (so post-intro scoop QA doesn't trip Confirm Monster events).
- `Create Dante` (post-intro) must fire successfully — verify Dante actually spawns when `setupGame` lands on scoop with `intro_scoop:done`.
- All existing QA scripts must still pass.

### QA Validation

Use `/puppeteer`. Add `qa/paper-scoop-intro-test.ts`:

1. `launchGame()` + `setupGame({ map: "spyder_paper_scoop", tileX: 4, tileY: 8, monsters: [] })` with intro variables cleared (`intro_scoop` unset, `choice_phase` unset, no party).
2. Verify all 7 NPCs spawn at their upstream positions.
3. Watch `Intro Storekeeper` choreography. Advance through dialogs. Verify rename UI appears; accept the random name.
4. Verify `choice_phase=yes`. `Choice` event fires `choice_monster` — verify menu shows all 5 starter slugs (budaye/dollfin/grintot/ignibus/memnomnom).
5. Pick `budaye`. Verify `myintrochoice=budaye`, `billie_choice=budaye` (set by the `Billie Budaye` sibling event), `choice_phase=next`.
6. Confirm "yes". Verify `choice_phase=progress`.
7. Watch `Continue Storekeeper` choreography. Verify NPCs exit one by one, dialog `_shopkeeper4` plays, **teleport to `spyder_bedroom.tmx,3,4`**, `intro_scoop:done` set.
8. **Critical:** verify the player's party is still empty. The scoop choice should NOT have added a monster to the player.
9. Test "No" on confirm: setupGame back to scoop with `choice_phase:next`, pick "no", verify loop back to `choice_phase:yes` and `Choice` re-fires.
10. Screenshot during the `Choice` step — should match `/home/jake/Pictures/Screenshots/20260520_110852.png`.

**Second-visit QA** — `qa/paper-scoop-talk-dante-test.ts`:
1. `setupGame({ map: "spyder_paper_scoop", tileX: 5, tileY: 6, monsters: [], variables: { intro_scoop: "done", choice_phase: "progress", billie_choice: "budaye" }})`.
2. Verify Dante exists at (11,6) (via `Create Dante`).
3. Walk to Dante, press INTERACT facing him. Verify `Talk Dante No Party` fires: dialog `spyder_papertown_danteresting`, sets `dantefirst:yes`.
4. Walk to (6,10) facing down. Verify `Go Outside` teleports to `spyder_paper_town.tmx,19,13`.

## Acceptance Criteria

- [ ] `spyder_paper_scoop.tmx` ported (13×11) and registered in `maps.ts`
- [ ] `public/assets/events/spyder_paper_scoop.yaml` is `cp`-verbatim from upstream
- [ ] All 7 NPC sprites registered + byte-verified against upstream (`cmp` per `[[feedback_sprite_byte_compare]]`)
- [ ] All required dialog msgids appended to `en_US.po`
- [ ] `create_npc … ,wander` 4th-arg handled gracefully (no crash, no mis-facing)
- [ ] `rename_player` works inside `OverworldScene`
- [ ] **Scoop choice does NOT add the chosen monster to the player's party** (correction from earlier draft) — verify with explicit QA assertion
- [ ] `Talk Dante No Party` sets `dantefirst:yes` (required by STORY-0196)
- [ ] `qa/paper-scoop-intro-test.ts` and `qa/paper-scoop-talk-dante-test.ts` pass; intro screenshot matches reference
- [ ] `setupGame()` updated with `intro_scoop:done`, `choice_phase:progress`, `billie_choice`, `myintrochoice` for post-intro scoop QA; all existing QA scripts pass unchanged
- [ ] `npm run format:check && npm run lint && npx tsc --noEmit && npm test` all pass
