# STORY-0199: Add character creation flow (port start_tuxemon)

## Description

Port upstream Tuxemon's character-creation scene from `start_tuxemon.yaml` and wire it in as the new-game entry point. Replaces the direct-to-bedroom boot path that STORY-0194 set up: pressing **New Game** on the title screen should now drop the player into a sequence of three dialog choices (campaign → gender → race), apply the chosen player template, and then teleport to `spyder_bedroom.tmx,4,4` — the same point STORY-0194 currently boots into.

This is a prerequisite for the full upstream intro flow. Without it, players have no gendered avatar and the `set_char_attribute player,gender,X` and `set_template player,<skin>,<skin>` mechanics that downstream content depends on don't run.

**Depends on**: none. STORY-0194 is already in done; this story revises the boot path it set up.

### Upstream reference

- `upstream/mods/tuxemon/maps/start_tuxemon.yaml` — the event script (12 events total: Scenario, Gender, Gender Male, Gender Female, Gender Nonbinary, Black Female, Black Male, Gender Enby, Whatever Penguin, White Female, White Male, Spyder).
- `upstream/mods/tuxemon/l18n/en_US/LC_MESSAGES/base.po` — dialogue msgids: `spyder_campaign`, `xero_campaign`, `water_campaign`, `gender_male`, `gender_female`, `gender_nonbinary`, `black_male`, `white_male`, `black_female`, `white_female`, `gender_enby`, `gender_whatever`, plus the choice prompts (look near these for the headers).
- Existing TitleScene boot path: `src/game/scenes/TitleScene.ts` (constants `NEW_GAME_MAP`, `NEW_GAME_SPAWN_X`, `NEW_GAME_SPAWN_Y`).

### Upstream YAML — the gating logic in plain English

The events all fire state-based (no position triggers). The state machine is:

1. **Scenario** fires when no choice vars set. `change_bg gradient_blue` → `translated_dialog_choice spyder_campaign:xero_campaign:water_campaign,scenario_choice`. Sets `scenario_choice` to one of three slugs.
2. **Gender** fires when `scenario_choice` set but `gender_choice` and `race_choice` not. `change_bg gradient_blue,choice_gender,image` → `translated_dialog_choice gender_male:gender_female:gender_nonbinary,gender_choice`. Sets `gender_choice`.
3. **Gender Male / Female / Nonbinary** fire on the matching `gender_choice` value. Each runs `set_char_attribute player,gender,<value>` then `change_bg gradient_blue,choice_gender,image` then `translated_dialog_choice <option1>:<option2>,race_choice`. Sets `race_choice`.
4. **Black/White Female/Male/Gender Enby/Whatever Penguin** fire on the matching `race_choice`. Each runs `set_template player,<skin>,<skin>` (skin slugs are determined by reading the YAML — port verbatim).
5. **Spyder** fires when `scenario_choice:spyder_campaign` + both other vars set. `change_bg gradient_blue` → `transition_teleport player,spyder_bedroom.tmx,4,4,0.3`.

### What to build

1. **Wire the new-game flow through start_tuxemon**
   - Remove the direct-to-bedroom shortcut from `src/game/scenes/TitleScene.ts` (the `NEW_GAME_MAP`/`SPAWN_X`/`SPAWN_Y` constants and the launch path that uses them). After this story, "New Game" should boot into a state that runs the `start_tuxemon` event script before any map renders.
   - Cleanest implementation: copy `upstream/mods/tuxemon/maps/start_tuxemon.yaml` to `public/assets/events/start_tuxemon.yaml` (it may already be there as a stub from earlier work — check `git log -- public/assets/events/start_tuxemon.yaml`), and have the title scene transition into `CutsceneScene` (or whatever scene currently runs map-less event scripts in our engine) pointing at that file. The final `transition_teleport` in the Spyder event will hand off to `OverworldScene` at `spyder_bedroom.tmx,4,4`.
   - If we have no scene that runs YAML event scripts without an associated map: build one. Upstream calls this its "background scene" — gradient_blue is the backdrop, the only interaction is dialog choices.

2. **`set_char_attribute` action**
   - New action at `src/game/event/actions/setCharAttribute.ts`. Args: `<char>,<attr>,<value>`. Initial usage is only `player,gender,<male|female|nonbinary>` — store it on the player's session model. Register in the action registry. Trivially extensible if more attributes appear later.

3. **`set_template` action**
   - New action at `src/game/event/actions/setTemplate.ts`. Args: `<char>,<sprite_name>,<combat_front>`. For the player, this should change the overworld sprite that's used when the player next loads into a map. Upstream uses both args — the first is the world sprite slug, the second is the front-battle sprite (defer the battle-sprite piece if it's not blocking).
   - Need ~8 player skin spritesheets in `public/assets/sprites/` (port from `upstream/mods/tuxemon/sprites/`). Slugs are determined by reading the start_tuxemon YAML — copy verbatim. Each is the 48×128 walk-cycle layout matching `[[project_npc_sprite_assets]]`.

4. **`translated_dialog_choice` + `change_bg` + `change_bg_char` in this no-map context**
   - These actions exist already (used in the bedroom cinematic per STORY-0195). Verify they run correctly inside the new map-less scene. If `change_bg` assumes an `OverworldScene` exists, lift it to work in the start scene as well.
   - Background `choice_gender` image: port from `upstream/mods/tuxemon/gfx/ui/background/choice_gender.png` (or wherever the asset lives — search the upstream tree).

5. **Port dialogue strings**
   - Append all 12 campaign/gender/race choice msgids and any associated prompt msgids to `public/assets/l10n/en_US.po`. Read the upstream `base.po` for the strings — don't paraphrase. Multi-line entries use the PO continuation format our loader handles.

6. **Make sure subsequent intro stories aren't blocked**
   - The 5 dialogue trees expand into 8 race options total, each setting a unique `race_choice` value. For STORY-0200/0196/0197/0198, the only thing that matters downstream is that `set_template` ran (so the player sprite isn't the placeholder) and that the teleport landed at `spyder_bedroom.tmx,4,4`. Variables `scenario_choice`/`gender_choice`/`race_choice` are mostly inert after this point — nothing in spyder_bedroom or beyond reads them (verify with `grep -r "scenario_choice\|race_choice" upstream/mods/tuxemon/maps/`).

### Engine notes

- The start scene needs to be entered with **no save loaded yet** (no party, no map). `setupGame()` should still bypass it cleanly — see below.
- `set_template` needs to mutate `session.player.template` (or whatever the equivalent is) and trigger a sprite reload the next time the player enters a map. Easiest: store the slug; `OverworldScene` reads it when constructing the player sprite.

### Keep `setupGame()` working

`setupGame()` (in `src/game/debug.ts`) bypasses the whole new-game flow for QA. After this story:
- It should pre-set `scenario_choice:spyder_campaign`, `gender_choice:gender_male` (or whatever default), `race_choice:white_male` (or any valid value), and call the equivalent of `set_template` so the player has a non-placeholder sprite.
- All existing QA scripts that call `setupGame` must still pass — none of them should suddenly land in the character-creation flow.
- Add an option to `setupGame` to set a specific skin if a QA script wants to test gendered avatars.

### QA Validation

Use `/puppeteer`. Add `qa/character-creation-test.ts`:

1. `launchGame()` (no `setupGame`!) — title screen renders.
2. Pick "New Game". Verify the scenario-choice menu appears (3 options).
3. Pick "spyder_campaign". Verify the gender menu appears (3 options).
4. Pick "gender_male". Verify the race menu appears (2 options: black_male / white_male).
5. Pick "white_male". Verify `change_bg gradient_blue` then teleport to `spyder_bedroom.tmx,4,4`.
6. Verify the player sprite on the bedroom map matches the `white_male` template (not the default placeholder).
7. Check session: `scenario_choice=spyder_campaign`, `gender_choice=gender_male`, `race_choice=white_male`, player gender attribute = `male`.
8. Repeat with one other gender path (e.g. female → black_female) to confirm branching works.

## Acceptance Criteria

- [ ] Pressing "New Game" on the title screen enters `start_tuxemon` flow, not the bedroom directly
- [ ] `public/assets/events/start_tuxemon.yaml` matches upstream verbatim (only deviations explicitly justified)
- [ ] All 12 events from upstream are present and gated correctly
- [ ] `set_char_attribute` and `set_template` actions implemented and registered
- [ ] Player skin spritesheets ported into `public/assets/sprites/` (one per race option in upstream)
- [ ] `choice_gender` background image ported
- [ ] All character-creation l10n msgids appended to `public/assets/l10n/en_US.po`
- [ ] `qa/character-creation-test.ts` passes both a male and a female path
- [ ] `setupGame()` bypasses the flow cleanly; all existing QA scripts still pass unchanged
- [ ] STORY-0194's `NEW_GAME_MAP`/`NEW_GAME_SPAWN_X`/`NEW_GAME_SPAWN_Y` constants in `TitleScene.ts` removed (or repurposed) per `[[feedback_dead_code]]`
- [ ] `npm run format:check && npm run lint && npx tsc --noEmit && npm test` all pass
