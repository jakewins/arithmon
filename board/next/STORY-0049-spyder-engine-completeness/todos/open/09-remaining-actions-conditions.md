# Todo: Remaining Actions and Conditions

## What

Implement all remaining upstream actions and conditions that haven't been covered by previous todos. Many of these are lower-priority mechanics used in mid-to-late game areas, but they must at least be handled (stub with warning if full implementation isn't warranted yet) so upstream YAML files load cleanly.

## Actions to Implement

**Fully implement (used in important flows):**
- `teleport_faint` -- Explicitly trigger the faint teleport (vs. `set_teleport_faint` which only sets the location). Used in cathedral events when player can't pay healing bill.
- `remove_tech` -- Remove a technique from a monster. Used in dojo when learning new moves that replace old ones.
- `set_party_status` -- Update party status display in menus.
- `update_tile_properties` -- Change tile properties at runtime (e.g., make a tile surfable after an event). Used for bridges/barriers.

**Stub with warning (niche mechanics, full impl can wait):**
- `daycare` -- Open daycare interface. Complex breeding/growth mechanic used only in Paper Town daycare. Log warning, show "Coming soon" dialog.
- `dojo_method` -- Trigger dojo-specific evolution/technique method. Used only in dojo. Log warning, show placeholder dialog.
- `char_plague` / `quarantine` -- Spyder bite plague system. Only used in Candy Town hospital arc. Log warning.
- `tune_radio` -- Radio tuning minigame. Only used in rival's bedroom. Log warning.
- `change_taste` -- Change monster taste/food preference. Only used in dojo. Log warning.
- `add_step_tracker` / `remove_step_tracker` -- Track walking steps for egg hatching. Log warning.

## Conditions to Implement

**Fully implement:**
- `has_tuxepedia` -- Check if a monster is in the journal (caught/seen). We already have `monsterRegistry` in session. Just check `registry[slug].caught`.
- `check_max_tech` -- Check if a monster has the maximum number of techniques. Compare `monster.techniques.length >= MAX_TECHNIQUES` (upstream max is 4).
- `tile_property_updated` -- Check if `update_tile_properties` was used on a tile.
- `step_tracker` -- Check step count against a threshold.

## Implementation

For each action/condition:
1. Create the file in `src/game/event/actions/` or `src/game/event/conditions/`
2. Follow existing patterns (parse args, access session, return result)
3. For stubs: log `[action_name] (stub -- not yet implemented)` and either do nothing (actions) or return false (conditions)
4. Register in the action/condition registry

**Key implementation details:**

- `teleport_faint`: Call the same faint-teleport logic already used by `OverworldScene` when all monsters are defeated. Check `session.faintTeleport` and execute the teleport.
- `remove_tech`: Parse `monster_var,technique_slug`, find the technique, splice it from the monster's technique array.
- `update_tile_properties`: Store modified tile properties in a session map (`modifiedTiles: Record<string, Record<string, any>>`). Other systems check this when reading tile properties.
- `has_tuxepedia`: Check `session.monsterRegistry[slug]?.caught` (or `?.seen`).
- `check_max_tech`: Check `monster.techniques.length >= 4`.

## Verify with Puppeteer

Use `/puppeteer` to:
1. Trigger `teleport_faint` -- verify player teleports to faint location
2. Give monster 4 techniques, check `check_max_tech` returns true
3. Trigger `remove_tech` -- verify technique is removed, `check_max_tech` returns false
4. Mark a monster as caught in journal, check `has_tuxepedia slug,caught` returns true
5. For stubbed actions: trigger each one, verify no crash, just a console warning
6. Load an upstream YAML file that uses these actions (e.g., `spyder_dojo1.yaml`) -- verify it loads without errors

## Done When

- All stubbed actions log warnings but don't crash
- All fully-implemented actions work correctly
- All conditions evaluate correctly
- No upstream Spyder YAML file produces "unknown action/condition" errors
- Total action count: 69, total condition count: 32
