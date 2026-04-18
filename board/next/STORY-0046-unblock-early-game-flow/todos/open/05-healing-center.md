# Todo: Healing Center

## What

Create a healing center map in Cotton Town where a nurse NPC fully heals the player's party — HP and status conditions. This is the first "safe harbor" in the game loop.

## Why

Without healing, the player's monsters will faint after a few wild encounters and they'll have no way to recover (aside from limited potions). The healing center closes the gameplay loop: fight → get hurt → heal → fight again.

## Tuxemon Reference

Check `mods/tuxemon/maps/spyder_healing_center.tmx` for the canonical layout:

- **Size**: 13x11 tiles (small indoor map)
- **Tilesets**: core_indoor_floors, core_indoor_walls, core_set_pieces
- **Staff**: Nurse NPC behind a counter, possibly a professor/scientist NPC
- **Healing mechanic**: talk to nurse → all monsters healed (HP + status cleared)
- **Music**: "music_cathedral_theme"
- **Exit**: door at bottom → back to `spyder_cotton_town.tmx`

Also check `mods/tuxemon/db/npc/` for the nurse NPC definition and dialog keys.

## Implementation

### 1. Create the map

- Create `spyder_healing_center.json` in Tiled, based on Tuxemon's layout
- Small indoor map (13x11 or similar) with a counter, nurse behind it
- Use indoor tilesets: `CORE_INDOOR_FLOORS`, `CORE_INDOOR_WALLS`, `CORE_SET_PIECES`
- Register in `MAP_REGISTRY` in `src/game/data/maps.ts`

### 2. Healing mechanic

We already have `set_monster_health` and `set_monster_status` actions (used in `spyder_bedroom.yaml` for the bed). The healing center nurse can use the same approach:

```yaml
Heal Party:
  conditions:
  - is char_facing_char player,nurse
  - is button_pressed INTERACT
  actions:
  - char_face nurse,player
  - dialog Let me take care of your monsters... All healed up!
  - set_monster_health
  - set_monster_status
```

If `set_monster_health` without args heals to full (check the action implementation), this should just work. If not, we may need to extend it.

### 3. Nurse NPC

- Add a nurse NPC slug to `src/game/data/npcs.ts` — use an appropriate spritesheet (check what nurse sprites we have, or use an existing one like `picnicker` as a placeholder)
- Spawn the nurse in the healing center YAML

### 4. Door to Cotton Town

- Exit event at the door tile → `transition_teleport player,cotton_town.tmx,{x},{y},0.3`
- Add corresponding "Enter Healing Center" event in `cotton_town.yaml` at the healing center building door

### 5. Event file

Create `public/assets/events/spyder_healing_center.yaml` with:
- Nurse spawn
- Heal party on interact
- Exit door transition
- Music trigger

## Verify with Puppeteer

Use `/puppeteer` to:
1. Give the player a damaged party via debug API
2. Teleport to Cotton Town, enter the healing center
3. Screenshot the interior
4. Talk to nurse — verify dialog and healing
5. Check monster HP via debug API — verify fully healed
6. Walk out the door — verify return to Cotton Town
7. Walk back in — verify can heal again

## Done When

- `spyder_healing_center.json` map exists and is registered
- `spyder_healing_center.yaml` events exist
- Nurse NPC spawns and heals party on interaction
- Door connects bidirectionally to Cotton Town
- Player's party is fully restored (HP + status) after talking to nurse
