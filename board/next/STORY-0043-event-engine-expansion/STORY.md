# STORY-0043: Event Engine Expansion

## Description

Our event engine currently has 25 actions and 7 conditions. The Spyder campaign's first 1-2 hours (bedroom → Paper Scoop → Paper Town) uses ~50 actions and ~33 conditions. This story closes the gap by implementing the missing actions and conditions needed as plumbing before we can run the real campaign scripts.

**Key goal**: implement the missing event actions and conditions so that STORY-0044 (Starter Selection) and STORY-0045 (Trainer Battles) can wire up the actual Tuxemon YAML scripts.

We're scoping this to the **minimum viable set** — only actions/conditions that the Paper Scoop and early Paper Town events actually use. We defer day/night cycles, swimming, bills/economy, kennel/quarantine, and evolution to later stories.

### What's missing (scoped to first 1-2 hours)

#### Missing Actions (12)

| Action | What it does | Where it's used |
|--------|-------------|-----------------|
| `add_monster` | Add a monster to player's party by slug+level | Global (starter gift), Paper Scoop flow |
| `remove_monster` | Remove a monster from party by IID/slot | Global cheat code, party management |
| `add_item` | Add items to player inventory | NPC gifts (potions, tuxeballs) |
| `rename_player` | Set player name (or `random` for a random name) | Paper Scoop intro |
| `choice_monster` | Show a monster selection UI, store pick in variable | Paper Scoop starter selection |
| `open_journal` | Open journal scene focused on a specific monster | Paper Scoop display cases |
| `char_position` | Teleport NPC to exact tile coordinates instantly | Cutscene choreography |
| `char_stop` | Halt NPC movement/animation | Cutscene choreography |
| `pathfind_to_char` | NPC pathfinds to another character's position | Cutscene choreography |
| `clear_variable` | Delete a game variable | Global events (reset state) |
| `format_variable` | Convert variable type (string↔float↔int) | Global events (cathedral math) |
| `play_sound` | Play a one-shot sound effect | UI feedback, item pickup, etc. |

#### Missing Conditions (8)

| Condition | What it does | Where it's used |
|-----------|-------------|-----------------|
| `party_size` | Check party size with operators (equals, greater_than, less_than) | Paper Scoop, global events |
| `has_item` | Check if player has a specific item | Global events, NPC dialogue |
| `has_monster` | Check if player has a specific monster species | Post-selection checks |
| `char_facing` | Check which direction a character faces (not facing a tile, just direction) | Paper Scoop exit door |
| `check_char_parameter` | Check character attributes (name, moving state, etc.) | Global events |
| `battle_outcome` | Check result of last battle with a specific NPC (won/lost/fled) | Paper Scoop post-battle dialogue |
| `char_defeated` | Check if a character's entire party is fainted | Global faint-teleport |
| `current_state` | Check what game state is active (WorldState, CombatState) | Global events (guard conditions) |

### Tuxemon reference

- **Actions**: `tuxemon/event/actions/` — each action is a class with `start()` and `update()` methods, same pattern as ours
- **Conditions**: `tuxemon/event/conditions/` — each condition is a class with `test()`, same as ours
- **`behav: talk`**: Tuxemon events use a `behav` section for NPC interaction triggers (e.g., `behav: talk spyder_dante`). This is shorthand for "player interacts with this NPC". We handle this via `button_pressed` + `char_facing_char` conditions already, so we don't need to implement `behav` — but we should note it for when we translate campaign YAML files.

### Implementation notes

Each new action/condition follows the exact same pattern as existing ones:
- Actions: implement `EventAction` interface (`start`, `update`, `cleanup`, `done`), call `registerAction()`
- Conditions: implement `EventCondition` interface (`test`), call `registerCondition()`
- Import in `engine.ts` to trigger self-registration

Most are single-frame actions (set `done = true` in `start()`). The exceptions:
- `choice_monster` needs a UI overlay (similar to `translated_dialog_choice` but showing monster names/sprites)
- `open_journal` launches the JournalScene focused on a specific monster
- `pathfind_to_char` delegates to existing pathfind logic but resolves target dynamically

For `battle_outcome`, we need to track battle results on the session. Add a `battleOutcomes: Map<string, CombatOutcome>` to `GameSession` that maps NPC slug → last outcome. The `start_battle` action (STORY-0045) will write to this; the `battle_outcome` condition reads from it.

For `current_state`, we can check `ctx.scene.scene.key` to determine the active scene (OverworldScene = WorldState, CombatScene = CombatState, etc.).

### File structure

New files follow existing patterns:

```
src/game/event/
  actions/
    addMonster.ts
    removeMonster.ts
    addItem.ts
    renamePlayer.ts
    choiceMonster.ts
    openJournal.ts
    charPosition.ts
    charStop.ts
    pathfindToChar.ts
    clearVariable.ts
    formatVariable.ts
    playSound.ts
  conditions/
    partySize.ts
    hasItem.ts
    hasMonster.ts
    charFacing.ts
    checkCharParameter.ts
    battleOutcome.ts
    charDefeated.ts
    currentState.ts
```

### Tasks

1. **Session extensions** — add `battleOutcomes` map to `GameSession`
2. **Variable actions** — `clear_variable`, `format_variable`
3. **Inventory action + condition** �� `add_item`, `has_item`
4. **Monster actions + conditions** — `add_monster`, `remove_monster`, `party_size`, `has_monster`
5. **Player identity** — `rename_player`
6. **NPC choreography** — `char_position`, `char_stop`, `pathfind_to_char`
7. **Journal/choice actions** — `open_journal`, `choice_monster`
8. **Battle/state conditions** — `battle_outcome`, `char_defeated`, `current_state`
9. **Character conditions** — `char_facing`, `check_char_parameter`
10. **Sound** — `play_sound`
11. **Wire all imports in engine.ts**
12. **Tests** — unit tests for each new action/condition

## QA Validation

Use `/puppeteer` to verify the new actions work in a real browser. Write a QA script that:

1. Launches the game on cotton_town
2. Uses debug commands to trigger events that exercise the new actions:
   - Set and clear a variable, verify via `getState()`
   - Add a monster to party via an event, verify party size changed
   - Add an item, verify inventory updated
3. Verify conditions work by checking event engine evaluation

## Acceptance Criteria

- [ ] All 12 new actions implemented and registered in `engine.ts`
- [ ] All 8 new conditions implemented and registered in `engine.ts`
- [ ] `add_monster` adds a monster of the given slug+level to the player's party
- [ ] `choice_monster` shows a selection UI and stores the choice in a game variable
- [ ] `open_journal` opens the journal scene focused on the specified monster
- [ ] `party_size` supports `equals`, `greater_than`, `less_than` operators
- [ ] `battle_outcome` reads from session's `battleOutcomes` map
- [ ] `char_facing` checks direction without requiring a tile target
- [ ] Session extended with `battleOutcomes` tracking
- [ ] All code passes `npm run format:check && npm run lint && npx tsc --noEmit && npm test`
- [ ] QA validation passes via `/puppeteer`
