# STORY-0049: Spyder Engine Completeness

## Description

Our event engine currently supports 38 actions and 15 conditions. The upstream Tuxemon Spyder campaign uses **69 unique action types** and **32 unique condition types**. This story closes the gap so that every upstream Spyder campaign YAML file can be loaded and executed by our engine.

### Gap Analysis

**Actions we have (38):** dialog, translated_dialog, translated_dialog_choice, choice_monster, open_journal, open_shop, access_pc, char_position, char_face, char_stop, pathfind, pathfind_to_char, create_npc, remove_npc, start_battle, add_monster, remove_monster, set_monster_health, set_monster_status, set_teleport_faint, add_item, rename_player, set_char_attribute, set_template, lock_controls, unlock_controls, set_variable, clear_variable, format_variable, end_cutscene, transition_teleport, wait, screen_transition, change_bg, change_bg_char, change_bg_monster, play_music (stub), play_sound (stub)

**Actions to add (31):** load_yaml, modify_money, set_layer, set_bubble, set_environment, random_encounter, variable_math, copy_variable, set_economy, camera_position, char_talk, evolution, modify_bill, set_bill, modify_monster_bond, get_player_monster, get_party_monster, info, create_kennel, set_kennel_visible, update_tile_properties, update_time, set_party_status, teleport_faint, daycare, dojo_method, char_plague, quarantine, tune_radio, change_taste, add_step_tracker, remove_step_tracker, remove_tech

**Conditions we have (15):** button_pressed, char_at, char_exists, char_facing, char_facing_char, char_facing_tile, variable_set, hasMonster, hasItem, partySize, battleOutcome, checkCharParameter, charDefeated, currentState, musicPlaying (stub)

**Conditions to add (17):** money_is, location_inside, location_type, environment_is, check_party_parameter, time_is, char_in, char_sprite, bill_exists, bill_is, check_evolution, has_kennel, kennel, has_tuxepedia, check_world, step_tracker, tile_property_updated, check_max_tech

### Upstream Reference

All Spyder YAML files live at `mods/tuxemon/maps/spyder*.yaml` in the [Tuxemon repo](https://github.com/Tuxemon/Tuxemon/tree/development/mods/tuxemon/maps). Key files that exercise the most actions/conditions:

- `spyder.yaml` -- Global shared events (swimming, evolution, day/night, cathedral bills)
- `spyder_cathedral.yaml` -- Shared healing center events (billing, monster sales, PC)
- `spyder_leather_gym.yaml` -- Gym with `variable_math` scoring
- `spyder_leather_museum.yaml` -- Museum with `money_is` admission fee
- `spyder_dojo1.yaml` -- Evolution, technique learning, taste changes
- `spyder_greenwash_level3.yaml` -- Flashback sequences using `set_layer`

### QA Process

After completing each todo, **use the `/puppeteer` tool to verify** the new actions/conditions work. Each todo includes specific test scenarios.

## Todos

Work through these in order:

1. [Shared YAML loading and variable math](todos/open/01-shared-yaml-and-variables.md)
2. [Economy system](todos/open/02-economy-system.md)
3. [Visual overlays and camera](todos/open/03-visual-overlays-and-camera.md)
4. [Environment and location system](todos/open/04-environment-and-location.md)
5. [Monster query and evolution](todos/open/05-monster-query-and-evolution.md)
6. [Kennel and storage system](todos/open/06-kennel-and-storage.md)
7. [NPC speech and encounters](todos/open/07-npc-speech-and-encounters.md)
8. [Day/night cycle](todos/open/08-day-night-cycle.md)
9. [Remaining actions and conditions](todos/open/09-remaining-actions-conditions.md)
10. [Upstream YAML integration test](todos/open/10-upstream-yaml-integration-test.md)

## Acceptance Criteria

- [ ] All 69 upstream action types are handled (implemented or gracefully stubbed with warning)
- [ ] All 32 upstream condition types are handled (implemented or gracefully stubbed)
- [ ] `load_yaml` can compose shared event files (cathedral, spyder global)
- [ ] Money system works: earn, spend, check balance via `modify_money` and `money_is`
- [ ] `set_layer` renders RGBA overlay tints (flashback sepia, night blue)
- [ ] Evolution system can evolve monsters when conditions are met
- [ ] Kennel/storage system stores and retrieves monsters
- [ ] Day/night cycle affects encounters and screen tinting
- [ ] Every upstream `spyder*.yaml` file loads without "unknown action/condition" errors
- [ ] All code passes `npm run format:check && npm run lint && npx tsc --noEmit && npm test`
- [ ] Each todo verified via `/puppeteer` before committing
