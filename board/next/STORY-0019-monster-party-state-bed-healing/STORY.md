# STORY-0019: Monster Party State + Bed Healing

## Description

Set up the player's monster party/inventory as a proper part of game state, modelled after Tuxemon's party system. Then implement the bed-healing interaction in `spyder_bedroom` as a first consumer of that state.

This also introduces the `translated_dialog` action (plain i18n dialog, as opposed to `translated_dialog_choice` which we already have), since it's needed here and by several subsequent stories (0020, 0021).

### Tuxemon's party model

In Tuxemon, the player carries a party of monsters (up to 6). Each monster has:
- Species/slug (e.g. `rockitten`)
- Level
- Current HP / Max HP
- Status effects (poison, sleep, etc.)
- XP

The relevant session state is a list of monster instances. Our `Monster` class already exists at `src/game/model/Monster.ts` — check if it has the fields needed (HP, status, etc.) and extend if necessary.

### Upstream bed-healing event

From `spyder_bedroom.yaml`:

```yaml
Resting in Bed:
  actions:
  - screen_transition 1
  - wait 0.5
  - translated_dialog spyder_papertown_restinbed
  - set_monster_health
  - set_monster_status
  - set_teleport_faint player,spyder_bedroom.tmx,6,5
  conditions:
  - is button_pressed INTERACT
  - is char_facing_tile player
  height: 2
  type: event
  width: 1
  x: 0
  y: 2
```

The i18n key `spyder_papertown_restinbed` resolves to a rest message via the PO file (already loaded as `assets/l10n/en_US.po`).

### Tasks

1. **Add monster party to session state**
   - Add a `monsters: Monster[]` list to `PlayerState` in the session (`src/game/session.ts`)
   - Party starts empty (no way to add monsters yet — that comes with combat/catch mechanics later)

2. **Implement `translated_dialog` action**
   - Like `translated_dialog_choice` but simpler: look up the i18n key via `src/game/i18n.ts`, display the translated string as a dialog
   - Register as action type `translated_dialog`
   - This action is also needed by STORY-0020 and STORY-0021

3. **Implement `screen_transition` action**
   - Brief screen flash/fade effect (Tuxemon uses this for healing, sleeping, etc.)
   - The numeric arg is duration in seconds
   - A simple camera fade-out then fade-in is sufficient

4. **Implement `set_monster_health` action**
   - Restore all monsters in the party to full HP
   - No args — applies to entire party
   - No-op when party is empty (which it will be initially — that's fine)

5. **Implement `set_monster_status` action**
   - Clear all status effects from party monsters
   - No args — applies to entire party

6. **Implement `set_teleport_faint` action**
   - `set_teleport_faint player,spyder_bedroom.tmx,6,5` sets the respawn point when the player's party faints
   - Store this as a `faintTeleport` location on the session (map key + tile coords)
   - The actual fainting/respawn mechanic can come later; this just saves the location

7. **Add the `Resting in Bed` event to `spyder_bedroom.yaml`** (if not already added in STORY-0018)

8. **Tests**
   - `translated_dialog` action resolves i18n key and shows dialog
   - `set_monster_health` restores party HP
   - `set_monster_status` clears status effects
   - `set_teleport_faint` stores respawn location on session

## Dependencies

- STORY-0018 (loads `spyder_bedroom.yaml` as map events, fixes coordinate handling)

## Acceptance Criteria

- [ ] `PlayerState` has a `monsters` party list
- [ ] `translated_dialog` action looks up i18n keys and displays dialog text
- [ ] Interacting with the bed in `spyder_bedroom` triggers the healing sequence
- [ ] `set_monster_health` and `set_monster_status` operate on the party (no-op when empty)
- [ ] `set_teleport_faint` stores respawn location on session state
- [ ] All checks pass (`npm run format:check && npm run lint && npx tsc --noEmit && npm test`)
