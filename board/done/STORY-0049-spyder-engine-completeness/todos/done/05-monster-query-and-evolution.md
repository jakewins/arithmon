# Todo: Monster Query and Evolution

## What

Implement the monster introspection and evolution system: `evolution`, `get_player_monster`, `get_party_monster`, `info`, `check_party_parameter`, `check_evolution`, and `modify_monster_bond`.

## Why

Evolution is a core monster RPG mechanic -- monsters transform into stronger forms at certain levels or conditions. The Dojo system and global events check evolution readiness and trigger transformations. Monster query actions are used throughout the campaign to check party composition, display monster info, and drive conditional story events.

## Upstream Reference

**`evolution`** -- Check and trigger evolution for player's monsters:
```yaml
- evolution player     # checks all party monsters, triggers evolution dialog if ready
```
Upstream evolution is defined in monster YAML files (`evolutions` field) with conditions like level thresholds.

**`get_player_monster`** / **`get_party_monster`** -- Query monster and store to variable:
```yaml
- get_player_monster player,monster_var                        # first monster
- get_party_monster player,monster_var,evolution_stage,stage1  # filter by stage
```

**`info`** -- Query monster attribute into a variable:
```yaml
- info monster_var,level    # stores monster's level into a variable
```

**`check_party_parameter`** condition:
```yaml
- is check_party_parameter player,stage,stage1,greater_than,0   # has any stage1 monster
- is check_party_parameter player,stage,stage2,greater_than,0   # has any evolved monster
```

**`check_evolution`** condition:
```yaml
- is check_evolution player   # any monster ready to evolve
```

**`modify_monster_bond`** -- Change friendship/bond value:
```yaml
- modify_monster_bond player,monster_var,1    # increase bond by 1
```
Bond/friendship is tracked per monster and affects evolution conditions for some species.

## Implementation

1. **Add evolution data to monster definitions** (`src/game/data/monsters.ts`):
   - Add optional `evolutions` field: `{ species: string, level: number }[]`
   - Source evolution chains from upstream `mods/tuxemon/db/monster/*.yaml`
   - Example: Cataspike → Prophetoise at level 16, Budaye → Budaye2 at level 18

2. **Add `bond` field to MonsterInstance** (`src/game/model/`):
   - Default 0, incremented by battles or events
   - Used by some evolution conditions

3. **`evolution` action** (`src/game/event/actions/evolution.ts`):
   - Iterate player's party, check each monster against evolution conditions (level, bond)
   - If ready: show evolution animation/dialog, transform monster (update species, stats, sprite)
   - Preserve level, XP, and nickname

4. **`check_evolution` condition** (`src/game/event/conditions/checkEvolution.ts`):
   - Return true if any party monster meets evolution conditions

5. **`get_player_monster` / `get_party_monster` actions**:
   - Store a reference (or index) to a party monster in a game variable
   - Support optional filters (evolution_stage, etc.)

6. **`info` action** (`src/game/event/actions/info.ts`):
   - Read attribute (level, name, species, etc.) from a monster variable
   - Store result in another variable for dialog substitution

7. **`check_party_parameter` condition** (`src/game/event/conditions/checkPartyParameter.ts`):
   - Check if any party monster matches parameter criteria
   - Parameters: stage (evolution stage), level, species, etc.

8. **`modify_monster_bond` action** (`src/game/event/actions/modifyMonsterBond.ts`):
   - Modify bond value on the referenced monster

## Verify with Puppeteer

Use `/puppeteer` to:
1. Add a monster at evolution-ready level via debug API
2. Trigger `evolution player` event -- verify evolution dialog appears and monster transforms
3. Check `getState()` -- monster species should have changed
4. Test `check_evolution` condition before and after evolution
5. Test `get_player_monster`, then `info` to query level -- verify variable is set
6. Test `check_party_parameter player,stage,stage1,greater_than,0` with appropriate party

## Done When

- Evolution transforms monsters when level/bond conditions are met
- Monster query actions store references to party monsters in variables
- `info` reads monster attributes into variables
- `check_party_parameter` checks party composition
- `check_evolution` returns true when any monster can evolve
- `modify_monster_bond` adjusts bond values
- At least 3 evolution chains defined from upstream data
