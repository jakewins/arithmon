# Todo: NPC Speech Profiles and Triggered Encounters

## What

Implement `char_talk`, `random_encounter`, `char_in`, and `char_sprite` -- NPC dialog profiles and explicitly triggered wild encounters.

## Why

`char_talk` is used throughout the campaign for NPCs that have different dialog depending on context (pre-battle, post-battle win, post-battle lose). Instead of writing conditional events for each dialog variant, upstream defines speech profiles on NPC data and triggers them with `char_talk`. `random_encounter` is used on routes to explicitly trigger encounters at specific tiles (instead of relying solely on grass tile detection). `char_in` checks if the player is on a surfable tile, and `char_sprite` checks which template the player is using (normal vs swimmer vs invisible).

## Upstream Reference

**`char_talk`** -- Trigger an NPC's speech profile:
```yaml
# From spyder_cotton_tunnel.yaml
CarlosBattleTalk:
  behav:
    - talk spyder_cotton_tunnel_carlos
  conditions:
    - is char_facing_char player,spyder_cotton_tunnel_carlos
    - is button_pressed INTERACT
  actions:
    - char_talk spyder_cotton_tunnel_carlos,pre_battle
    - start_battle spyder_cotton_tunnel_carlos
```

NPC speech profiles are defined in `db/npc/*.yaml`:
```yaml
spyder_cotton_tunnel_carlos:
  template: dragonrider
  dialog:
    pre_battle: carlos_pre_battle_dialog
    post_battle_lose: carlos_lose_dialog
```

**`random_encounter`** -- Explicitly trigger a random encounter with rate:
```yaml
- random_encounter spyder_route1,3.5    # encounter table slug, rate
```

**`char_in`** condition -- Check if character is in a tile type:
```yaml
- is char_in player,surfable    # player is on a surfable tile
```

**`char_sprite`** condition -- Check current sprite template:
```yaml
- is char_sprite player,swimmer    # player has swimmer sprite
- not char_sprite player,invisible # player is not invisible
```

## Implementation

1. **Add speech profiles to NPC data** (`src/game/data/npcs.ts`):
   - Add optional `dialog` field to NPC definitions: `{ pre_battle?: string, post_battle_win?: string, post_battle_lose?: string }`
   - Dialog values are translation keys

2. **`char_talk` action** (`src/game/event/actions/charTalk.ts`):
   - Parse: `npc_slug,speech_type`
   - Look up NPC's dialog profile, get translation key for the speech type
   - Display as translated dialog

3. **`random_encounter` action** (`src/game/event/actions/randomEncounter.ts`):
   - Parse: `encounter_table_slug,rate`
   - Roll against rate (same logic as grass encounters in OverworldScene)
   - If triggered, look up encounter table, pick random monster, start wild battle

4. **`char_in` condition** (`src/game/event/conditions/charIn.ts`):
   - Check if the player's current tile has a specific property (e.g., `surfable`)
   - Requires checking tile properties from the map data

5. **`char_sprite` condition** (`src/game/event/conditions/charSprite.ts`):
   - Compare `session.player.template` against the argument
   - "swimmer", "invisible", "default" are the common values

## Verify with Puppeteer

Use `/puppeteer` to:
1. Set up an NPC with speech profiles, trigger `char_talk npc,pre_battle` -- verify correct dialog shows
2. Trigger `random_encounter spyder_route1,100` (rate 100 = guaranteed) -- verify wild battle starts
3. Test `char_sprite` condition: use `set_template player,swimmer`, then check condition evaluates true
4. Walk to a map tile, verify `char_in` correctly reads tile properties

## Done When

- `char_talk` shows context-appropriate NPC dialog from speech profiles
- `random_encounter` triggers wild encounters from encounter tables
- `char_in` checks tile type properties
- `char_sprite` checks current player template
- NPC data structure supports dialog profiles
