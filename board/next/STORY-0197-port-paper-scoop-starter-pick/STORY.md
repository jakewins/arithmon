# STORY-0197: Port spyder_paper_scoop map + bin starter-pick cutscene from upstream

## Description

Port the `spyder_paper_scoop` map (the outdoor back-of-store yard with bins, per `/home/jake/Pictures/Screenshots/20260520_110852.png`) and its bin-cutscene event script verbatim from current upstream Tuxemon. This is the **heart of the intro**: NPCs spawn, `spyder_dante` walks down to the bins, the player gets prompted for their name (`rename_player`), then picks one of five starter monsters from a `choice_monster` menu (`budaye:dollfin:grintot:ignibus:memnomnom`), confirms, NPCs exit choreographically, and the player teleports back to `spyder_bedroom.tmx`.

This is the largest story in the intro series. Sizing rationale: it's a single coherent cutscene with one map port — splitting further would risk breaking the choreography mid-flow.

**Depends on**: STORY-0195 (bedroom intro teleports the player here) and STORY-0196 (`spyder_dante` sprite registered).

### Upstream reference

- `upstream/mods/tuxemon/maps/spyder_paper_scoop.tmx` (13×11 tiles — small map, outdoor back-of-store yard with bins). Map dimensions and collisions are what makes the shopkeeper unreachable behind the bins.
- `upstream/mods/tuxemon/maps/spyder_paper_scoop.yaml` — the **verbatim event script** to port.
- `upstream/mods/tuxemon/l18n/en_US/LC_MESSAGES/base.po` — dialogue strings:
  - `spyder_intro_shopkeeper1` — "What a great presentation from our CEO! All Gold members are being offered a free tuxemon."
  - `spyder_intro_shopkeeper2` — "Just fill in this form."
  - `spyder_intro_shopkeeper3` — "Please, now return the form to the Shop Assistant, so we can give you the tuxemon."
  - `spyder_intro_shopkeeper4` — "I'm sorry, you are not a Gold member. This offer is for Gold members only.\nPlease go home now."
  - `spyder_intro_question_name` — "What is your name?"
  - `areyousure` — the yes/no confirmation prompt
  - `potions_in_shop`, `spyder_papertown_danteresting`, `spyder_papertown_danteworking`, `spyder_papertown_dante1`/2/3 (post-intro Dante dialogues)

### What to build

1. **Port the TMX map**
   - Export `upstream/mods/tuxemon/maps/spyder_paper_scoop.tmx` to our Tiled-JSON format (same procedure as STORY-0196).
   - The collision objects at the top of the map (y=32-128, x=0-208 area per `<object id="11">..`) are what makes the shopkeeper unreachable. Preserve them exactly.
   - Register in `src/game/data/maps.ts`.

2. **Drop in the upstream event YAML**
   - **Literal copy:** `cp upstream/mods/tuxemon/maps/spyder_paper_scoop.yaml public/assets/events/spyder_paper_scoop.yaml`. Our loader's schema matches upstream's exactly (including `behav: talk <npc>` auto-expansion). No hand-translation.
   - Our current `spyder_paper_scoop.yaml` has only "Create NPCs" and "Create Shopkeeper"; the upstream file has all of these (which will all come along with the copy):
     - `Billie Budaye`, `Billie Dollfin`, `Billie Grintot`, `Billie Ignibus`, `Billie Memnomnom` (each sets `billie_choice` based on `myintrochoice`)
     - `CapDev 1st` through `CapDev 5th` (display cases at y=8 that open the journal for each starter)
     - `Choice` (the `choice_monster budaye:dollfin:grintot:ignibus:memnomnom,myintrochoice` action)
     - `Confirm Monster`, `Confirm Monster No`, `Confirm Monster Yes`
     - `Continue Storekeeper` (the long NPC-exit choreography + final dialog + teleport back to bedroom + `set_variable intro_scoop:done`)
     - `Create Dante`, `Create NPCs`, `Create Shopkeeper`
     - `Go Outside` (at tile 6,10 → teleports to `spyder_paper_town.tmx,19,13`)
     - `Intro Storekeeper` (the main cutscene — Dante walks to bins, prompts name, sets `choice_phase:yes`)
     - `Potions` (display sign — already in our copy if at all)
     - `Route Music`
     - `Talk Dante Daycare`, `Talk Dante No Party`, `Talk Dante Omnichannel`, `Talk Dante Party`, `Talk Dante Player Returns` (post-intro Dante dialogues)

3. **Register the NPC sprites**
   - 7 NPCs spawn in the intro: `spyder_shopkeeper`, `spyder_dante` (already registered in STORY-0196), `spyder_papermart_miles`, `spyder_papermart_shirley`, `spyder_route2_roddick`, `spyder_papermart_harith`, `spyder_billie`.
   - Source PNGs from `upstream/mods/tuxemon/sprites/<slug>.png`. Apply `[[feedback_npc_registry_audit]]` — verify each `spritesheet:` against upstream `sprite_name`. Apply `[[feedback_npc_qa_dimension_check]]` — 48×128 dimensions, diff against upstream.

4. **Port dialogue strings**
   - Append all listed msgids/msgstrs from `upstream/mods/tuxemon/l18n/en_US/LC_MESSAGES/base.po` to `public/assets/l10n/en_US.po`.

5. **Verify the 5 starter monsters are registered**
   - Confirm `budaye`, `dollfin`, `grintot`, `ignibus`, `memnomnom` are all in `src/game/data/monsters.ts` with correct stats, types, movesets, and battle sprites. (Spot check confirms all 5 are registered as of writing — verify still true.)

6. **Engine fix: `create_npc … ,wander`**
   - Upstream uses `create_npc spyder_dante,11,6,wander` in the post-intro `Create Dante` event.
   - Our `src/game/event/actions/createNpc.ts` parses `args[3]` as a `Direction` — `"wander"` is not a valid direction and will mis-frame the sprite.
   - Fix: if `args[3]` is a known behavior keyword (`wander`, `path`, etc.), treat it as a behavior (no-op for now is fine — wandering can be a stub), and default facing to `down`. Don't crash on unknown args.

7. **Verify `choice_monster`, `rename_player`, `translated_dialog_choice` work in OverworldScene**
   - `rename_player` was previously used in `CutsceneScene` context. The bin cutscene runs inside `OverworldScene`. Confirm the rename UI overlay renders correctly when launched from OverworldScene; if not, fix the action so it works in both contexts.

### Engine notes

- All other actions (`change_bg`, `lock_controls`, `unlock_controls`, `translated_dialog`, `translated_dialog_choice`, `pathfind`, `char_face`, `wait`, `transition_teleport`, `remove_npc`, `set_variable`, `open_journal`, `play_music`, `create_npc`, `char_stop`, `pathfind_to_char`) — all already registered.
- All conditions (`variable_set`, `char_exists`, `music_playing`, `char_at`, `char_facing`, `char_facing_tile`, `char_facing_char`, `button_pressed`, `party_size`, `battle_outcome`) — all already registered.

### Keep `setupGame()` working

`setupGame()` (in `src/game/debug.ts`) currently sets `intro_scoop=done` so QA teleporting to `spyder_paper_scoop` doesn't trigger the bin cutscene. After your YAML port:
- Verify the gating conditions in `Intro Storekeeper`, `Create NPCs`, `Choice`, `Continue Storekeeper`, etc. actually read `intro_scoop:done` (and `choice_phase` for the choice-related events). If upstream uses a different variable name or value, update `setupGame()` to match.
- The post-intro state needs `Create Dante` (and `Create Shopkeeper`) to fire correctly so the map isn't empty after `setupGame`. Verify both events trigger when `intro_scoop:done` is set.
- After this story, `setupGame()` should also be able to seed `billie_choice` and `myintrochoice` (matching the monster it adds to the party), so post-intro QA scripts can teleport to scoop without the choice/confirm events misfiring. Update `setupGame` accordingly.
- Run **every** existing QA script after your changes — many of them call `setupGame()` with various map targets. None of them should start hitting the scoop cutscene unexpectedly.

### QA Validation

Use `/puppeteer`. Add `qa/paper-scoop-intro-test.ts`:

1. `launchGame()` + `setupGame({ map: "spyder_paper_scoop", tileX: 4, tileY: 8, monsters: [] })` with intro variables cleared (`intro_scoop` unset, `choice_phase` unset, no party).
2. Verify all 7 NPCs spawn at their upstream positions.
3. Step into / wait for `Intro Storekeeper` to fire. Advance through the dialog. Verify the rename UI appears; type a name (or accept the random); press Enter.
4. Verify `choice_phase=yes`. The `Choice` event fires `choice_monster` — verify the menu shows all 5 starters.
5. Pick `budaye`. Verify `myintrochoice=budaye`, then confirm "yes" — verify `billie_choice=budaye`, `choice_phase=progress`.
6. Watch the `Continue Storekeeper` choreography. Verify NPCs exit one by one, final dialog plays, player teleports back to `spyder_bedroom.tmx,3,4`. Verify `intro_scoop=done`.
7. **Critical:** verify the chosen starter is in the player's party at the end. (Note: in upstream this happens implicitly via the `billie_choice` variable and a downstream event; if our flow doesn't actually add the monster to the party, fix it — likely add an `add_monster <billie_choice>,5` step to the `Continue Storekeeper` event near the end.)
8. **Screenshot during the `Choice` step** — should look like `/home/jake/Pictures/Screenshots/20260520_110852.png` (outdoor scoop yard, bins visible, choice menu with 5 monster names).
9. Test "No" on confirm — verify it loops back to `choice_phase=yes`.

## Acceptance Criteria

- [ ] `spyder_paper_scoop.tmx` ported (13×11) and registered in `maps.ts`
- [ ] `public/assets/events/spyder_paper_scoop.yaml` is a verbatim port of upstream
- [ ] All 7 NPC sprites registered + verified against upstream `sprite_name`
- [ ] All required dialogue msgids appended to `public/assets/l10n/en_US.po`
- [ ] All 5 starter monsters confirmed registered with sprites
- [ ] `create_npc` action handles `wander` 4th-arg gracefully
- [ ] `rename_player` action works inside `OverworldScene` context
- [ ] Chosen starter ends up in the player's party (verify and add `add_monster` if needed)
- [ ] `qa/paper-scoop-intro-test.ts` passes; screenshot matches reference
- [ ] `setupGame()` updated with `intro_scoop=done`, `choice_phase=progress`, `billie_choice`, `myintrochoice` so post-intro QA can teleport to scoop without misfiring; all existing QA scripts that call it still pass unchanged
- [ ] `npm run format:check && npm run lint && npx tsc --noEmit && npm test` all pass
