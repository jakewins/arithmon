# STORY-0011: Dialog Choice Action

## Description

Add a `translated_dialog_choice` action to the event engine that presents the player with a multiple-choice menu and stores their selection in a game variable. Demonstrate it by extending the Greeter NPC in Cotton Town — after the greeting, the player picks a response, and the greeter says goodbye differently depending on which option was chosen.

This is the first step toward supporting Tuxemon's `start_tuxemon.yaml` scenario, which uses `translated_dialog_choice` as its core mechanic to drive campaign, gender, and appearance selection (see `mods/tuxemon/maps/start_tuxemon.yaml` in the Tuxemon repo). Full compatibility with that file also requires `change_bg`, `transition_teleport`, and `set_template` — those are follow-up stories.

### How `translated_dialog_choice` works in Tuxemon

```yaml
# Tuxemon syntax:
- translated_dialog_choice spyder_campaign:xero_campaign:water_campaign,scenario_choice
```

- Colon-separated list of option keys before the comma
- Variable name after the comma
- Displays a menu with one button per option
- On selection, sets the variable (e.g. `scenario_choice:spyder_campaign`)
- Tuxemon resolves the keys through i18n lookup; we'll use them as literal display labels for now

### What we'll build

**New action: `translated_dialog_choice`**

- Syntax: `translated_dialog_choice option1:option2:option3,variable_name`
- Multi-frame (blocking): shows a choice menu in the dialog area
- Player navigates with arrow keys (up/down) and confirms with INTERACT
- On selection, runs `set_variable variable_name:chosen_option`
- Action completes after selection

**Updated Greeter NPC scenario** (`cotton_town.yaml`):

The greeter interaction becomes a multi-event sequence:

1. Talk to greeter → greeting dialog → `translated_dialog_choice` asking "How are you?" with options like `good:bad` → stores result in `greeter_mood`
2. A follow-up event (conditioned on `greeter_mood:good`) → greeter says a cheerful goodbye
3. A follow-up event (conditioned on `greeter_mood:bad`) → greeter says a sympathetic goodbye

This exercises the same condition-driven branching pattern that `start_tuxemon.yaml` uses (set a variable, then different events fire based on its value).

### Tasks

1. **Choice menu UI**
   - Render a list of labeled options in the dialog box area
   - Highlight the currently selected option
   - Arrow keys (up/down) move selection
   - INTERACT key confirms and dismisses the menu
   - Keep it simple — text labels, highlight bar, no icons

2. **`translated_dialog_choice` action** (`event/actions/translatedDialogChoice.ts`)
   - Parse args: split on comma → options string + variable name; split options on colon
   - On start: display the choice menu
   - On each frame: read input to update selection
   - On confirm: call `setVariable(variableName, selectedOption)`, mark done
   - Register in the action registry

3. **Update Cotton Town YAML** (`assets/events/cotton_town.yaml`)
   - Extend the Greeter NPC interaction to include a `translated_dialog_choice`
   - Add two follow-up events with `variable_set greeter_mood:good` / `greeter_mood:bad` conditions
   - The follow-up events should use `behav: talk greeter` so the player re-interacts to hear the goodbye

4. **Tests**
   - Action parses options and variable name correctly
   - Selecting an option sets the expected variable
   - Condition-driven follow-up events fire based on the stored choice
   - Menu navigation (up/down wrapping, confirm)

## Acceptance Criteria

- [ ] `translated_dialog_choice opt1:opt2,var` action shows a choice menu in the dialog area
- [ ] Arrow keys navigate options, INTERACT confirms
- [ ] Confirmed selection is stored as a game variable (`var:opt1`)
- [ ] Greeter NPC in Cotton Town asks a question with choices
- [ ] Greeter responds differently on next interaction based on the player's choice
- [ ] Action name matches Tuxemon's so their YAML can be loaded without renaming
- [ ] All code passes formatter, linter, typecheck, and tests
