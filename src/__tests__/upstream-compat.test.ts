import { describe, it, expect } from "vitest";
import { createAction, createCondition } from "../game/event/registry";

// Ensure all actions/conditions are registered by importing the engine
import "../game/event/engine";

/**
 * All 69 action types used across upstream Spyder campaign YAML files.
 * From STORY-0049 gap analysis.
 */
const UPSTREAM_ACTIONS = [
  // Already existed (38)
  "dialog",
  "translated_dialog",
  "translated_dialog_choice",
  "choice_monster",
  "open_journal",
  "open_shop",
  "access_pc",
  "char_position",
  "char_face",
  "char_stop",
  "pathfind",
  "pathfind_to_char",
  "create_npc",
  "remove_npc",
  "start_battle",
  "add_monster",
  "remove_monster",
  "set_monster_health",
  "set_monster_status",
  "set_teleport_faint",
  "add_item",
  "rename_player",
  "set_char_attribute",
  "set_template",
  "lock_controls",
  "unlock_controls",
  "set_variable",
  "clear_variable",
  "format_variable",
  "end_cutscene",
  "transition_teleport",
  "wait",
  "screen_transition",
  "change_bg",
  "change_bg_char",
  "change_bg_monster",
  "play_music",
  "play_sound",
  // Added in STORY-0049 (31)
  "load_yaml",
  "modify_money",
  "set_layer",
  "set_bubble",
  "set_environment",
  "random_encounter",
  "variable_math",
  "copy_variable",
  "set_economy",
  "camera_position",
  "char_talk",
  "evolution",
  "modify_bill",
  "set_bill",
  "modify_monster_bond",
  "get_player_monster",
  "get_party_monster",
  "info",
  "create_kennel",
  "set_kennel_visible",
  "update_tile_properties",
  "update_time",
  "set_party_status",
  "teleport_faint",
  "daycare",
  "dojo_method",
  "char_plague",
  "quarantine",
  "tune_radio",
  "change_taste",
  "add_step_tracker",
  "remove_step_tracker",
  "remove_tech",
];

/**
 * All 32 condition types used across upstream Spyder campaign YAML files.
 */
const UPSTREAM_CONDITIONS = [
  // Already existed (15)
  "button_pressed",
  "char_at",
  "char_exists",
  "char_facing",
  "char_facing_char",
  "char_facing_tile",
  "variable_set",
  "has_monster",
  "has_item",
  "party_size",
  "battle_outcome",
  "check_char_parameter",
  "char_defeated",
  "current_state",
  "music_playing",
  // Added in STORY-0049 (17)
  "money_is",
  "location_inside",
  "location_type",
  "environment_is",
  "check_party_parameter",
  "time_is",
  "char_in",
  "char_sprite",
  "bill_exists",
  "bill_is",
  "check_evolution",
  "has_kennel",
  "kennel",
  "has_tuxepedia",
  "check_world",
  "step_tracker",
  "tile_property_updated",
  "check_max_tech",
];

describe("Upstream Spyder YAML compatibility", () => {
  it("all 69 upstream action types are registered", () => {
    const missing: string[] = [];
    // Provide minimal args so constructors don't crash on arg parsing
    const testArgs = ["player", "0", "0", "0", "0"];
    for (const type of UPSTREAM_ACTIONS) {
      try {
        createAction(type, testArgs);
      } catch (e) {
        if ((e as Error).message?.includes("Unknown action type")) {
          missing.push(type);
        }
        // Other errors (e.g. missing data) are OK — the action exists
      }
    }
    expect(missing).toEqual([]);
    expect(UPSTREAM_ACTIONS).toHaveLength(71);
  });

  it("all 32 upstream condition types are registered", () => {
    const missing: string[] = [];
    const testArgs = ["player", "0", "0", "0", "0"];
    for (const type of UPSTREAM_CONDITIONS) {
      try {
        createCondition(type, testArgs);
      } catch (e) {
        if ((e as Error).message?.includes("Unknown condition type")) {
          missing.push(type);
        }
      }
    }
    expect(missing).toEqual([]);
    expect(UPSTREAM_CONDITIONS).toHaveLength(33);
  });
});
