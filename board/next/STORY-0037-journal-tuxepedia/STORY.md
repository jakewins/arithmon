# STORY-0037: Journal / Tuxepedia

## Description

Add a monster encyclopedia (Tuxemon's "Journal" / the Pokedex equivalent) that tracks which monsters the player has seen and caught. Accessible from the pause menu.

**Key goal**: align with Tuxemon's three-screen journal flow — page selection, monster list, monster detail.

### Tuxemon reference

- **Journal choice**: `tuxemon/states/journal_choice.py` — `JournalChoice(PygameMenuState)` shows page ranges (e.g. "1-20", "21-40") in a 2-column grid. Pages with no registered monsters are grayed out.
- **Journal list**: `tuxemon/states/journal_state.py` — `JournalState(PygameMenuState)` shows 20 monsters per page in a 2-column scrollable list. Three visual states:
  - **Not registered**: grayed out as "42. -----"
  - **Seen**: name shown, clickable
  - **Caught**: name shown with circle marker (indicates captured)
- **Journal info**: `tuxemon/states/journal_info.py` — `JournalInfoState(PygameMenuState)` full detail: name, txmn_id, species, weight, height, type icons, shape, description, evolution info, front sprite. If only "seen" (not caught), text fields show "-----". LEFT/RIGHT cycles through registered monsters.
- **Tracking**: Monster seen/caught status tracked per species. Seeing a monster in combat registers it as "seen". Catching it registers as "caught".

### What to build

#### 1. Seen/caught tracking

Add to session state:

```typescript
interface MonsterRegistry {
  seen: Set<string>;    // monster slugs seen in combat
  caught: Set<string>;  // monster slugs captured
}
```

- Mark a species as "seen" when encountered in combat (on battle start)
- Mark as "caught" when captured (STORY-0034)
- Persist in session

#### 2. Journal screen — monster list

Since we'll start with a small number of monsters, skip the page-selection screen (Tuxemon's `JournalChoice`) and go directly to a single scrollable list:

- Shows all monster species from the database
- Three visual states: unknown (grayed "???"), seen (name visible), caught (name + checkmark/ball icon)
- Arrow keys to scroll, SPACE/Z to view details, ESC to close
- Numbers/IDs shown alongside names

#### 3. Journal detail screen

When selecting a seen/caught monster:

- Large front sprite
- Name, species number
- Base stats (or actual stats if caught)
- Type/element
- Description text
- If only seen (not caught): some fields show "???"
- LEFT/RIGHT to cycle through registered (seen/caught) monsters

#### 4. Wire to pause menu

Add "Journal" option to the pause menu (STORY-0035) between Tuxemon and Bag.

### File structure

```
src/game/
  scenes/
    JournalScreen.ts       # Monster list + detail view
  model/
    monsterRegistry.ts     # Seen/caught tracking
```

Mirrors Tuxemon's `states/journal_state.py` and `states/journal_info.py`.

### Tasks

1. **Monster registry** — seen/caught tracking on session, mark on encounter/capture
2. **Journal list screen** — scrollable monster list with seen/caught/unknown states
3. **Journal detail screen** — sprite, stats, description for selected monster
4. **Wire to pause menu** — add "Journal" option
5. **Wire combat** — mark monster as "seen" on battle start
6. **Tests** — registry tracking, display states

## Acceptance Criteria

- [ ] Encountering a monster in combat marks it as "seen" in the registry
- [ ] Capturing a monster marks it as "caught"
- [ ] Journal screen lists all monster species with seen/caught/unknown visual states
- [ ] Selecting a seen/caught monster shows detail: sprite, stats, description
- [ ] Unknown monsters show "???" for hidden fields
- [ ] Caught monsters show more detail than merely-seen ones
- [ ] Accessible from pause menu
- [ ] All code passes formatter, linter, typecheck, and tests
