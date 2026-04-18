# Todo: New Monster Species

## What

Add the monster species needed for Route 1 and Route 2 encounter tables: Pairagrin, Aardorn, Cataspike, Cardiling, and Eyenemy.

## Why

Route encounters need distinct monsters to make each area feel different. These are the species Tuxemon uses for the early routes.

## Tuxemon Reference

Check `mods/tuxemon/db/monster/` for each species YAML file:

- **`pairagrin.yaml`** — Route 1 common. Check base stats, moves, catch rate, XP yield.
- **`aardorn.yaml`** — Route 1 common. Earth-type creature.
- **`cataspike.yaml`** — Route 1 common. Bug-like creature.
- **`cardiling.yaml`** — Route 2. Fire-type bird.
- **`eyenemy.yaml`** — Route 2. Eye-themed creature.

Also check `mods/tuxemon/gfx/sprites/battle/` for front/back battle sprites and `mods/tuxemon/gfx/sprites/overworld/` for overworld sprites (though we may only need battle sprites for now).

Replicate the stat distributions, movesets, catch rates, and XP yields from Tuxemon's definitions.

## Implementation

1. **Add species to `src/game/data/monsters.ts`**:
   - For each new species, define: name, baseHP, baseAttack, baseDefense, baseSpeed, baseXpYield, catchRate, moves (with learn levels)
   - Match Tuxemon's values as closely as our stat system allows

2. **Add battle sprites** to `public/assets/sprites/`:
   - Source front sprites from Tuxemon's `gfx/sprites/battle/{species}-front.png`
   - Register sprite keys for preloading

3. **Add techniques** if any new species has moves we don't have yet:
   - Check each species' moveset against our `src/game/data/techniques.ts`
   - Add any missing techniques with appropriate power/accuracy/DP cost

4. **Update encounter tables** from todo 01 to use the real species slugs instead of placeholders.

## Verify with Puppeteer

Use `/puppeteer` to:
1. Add each new monster to the player's party via debug API
2. Enter a wild battle — verify the new monster's sprite renders
3. Check the party screen — verify stats display correctly
4. Walk Route 1 grass — verify new species appear in encounters
5. Screenshot each new species in battle

## Done When

- All 5 species defined in monster registry with stats, moves, catch rate
- Battle sprites exist and render correctly
- Species appear in route encounter tables
- Any new techniques needed by these species are added
