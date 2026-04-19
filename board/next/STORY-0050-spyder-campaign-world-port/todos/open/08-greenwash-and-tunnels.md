# Todo: Greenwash and Tunnels

## What

Add Greenwash lab (3 levels + greenhouse), Cotton Tunnel, Dragon's Cave, and Dryad's Grove -- the mid-to-late game dungeon areas.

## Why

Greenwash is a major story dungeon with 3 flashback sequences revealing the campaign's backstory. Cotton Tunnel is a high-level area (L25-40) connecting to two optional dungeons: Dragon's Cave and Dryad's Grove. These areas have the strongest wild encounters before the endgame.

## Upstream Reference

**Source files:**
- Maps: `spyder_greenwash.tmx`, `spyder_greenwash_level2.tmx`, `spyder_greenwash_level3.tmx`, `spyder_greenwash_greenhouse.tmx`, `spyder_cotton_tunnel.tmx`, `spyder_dragons_cave.tmx`, `spyder_dryads_grove.tmx`
- Events: `spyder_greenwash_level3.yaml`, `spyder_cotton_tunnel.yaml`

**Greenwash flashbacks** (from `spyder_greenwash_level3.yaml`):
Each flashback follows this pattern:
```yaml
1. lock_controls
2. set_template player,invisible      # hide player
3. set_layer 102:51:0:128             # sepia tint
4. create_npc flashback_npc1,...      # spawn past characters
5. translated_dialog flashback_scene  # dialog plays out
6. remove_npc flashback_npc1,...      # cleanup
7. set_layer                          # clear tint
8. set_template player,default        # restore player
9. unlock_controls
```
Three flashback sequences: Dempsey incident, Fossilator unveiling, The Incident.

**Cotton Tunnel encounters (levels 25-40):**
Dinoflop, Furnursus, Boltnu, Metesaur -- all new species.
Also has item pickups: Tuxeballs, Cureall, Imperial Potion/Tea.
Trainer: Carlos (dragonrider with battle dialog via `char_talk`).

**Dragon's Cave encounters (levels 20-28):** Agnite, Agnidon (rare), Embra
**Dryad's Grove encounters (levels 20-28):** Coleorus (rare), Tourbidi, Shybulb

## Implementation

1. **Export ~7 maps** from upstream
2. **Add many new species** (~10): Dinoflop, Furnursus, Boltnu, Metesaur, Agnite, Agnidon, Embra, Coleorus, Tourbidi (some may overlap with earlier todos)
3. **Add new items**: Cureall, Imperial Potion, Imperial Tea
   - Define in `items.ts` with healing amounts and prices
4. **Greenwash events**:
   - Floor transitions between 3 levels + greenhouse
   - 3 flashback sequences following the pattern above
   - PC terminals with readable messages (`translated_dialog`)
   - This heavily tests `set_layer`, `set_template invisible`, `create_npc`/`remove_npc`
5. **Cotton Tunnel events**:
   - Trainer Carlos with `char_talk` speech profiles
   - Item pickup events (`add_item` when stepping on item tiles)
   - Gate to Dragon's Cave (may be story-gated with `variable_set`)
6. **Cave/Grove events**: Encounter-heavy areas with optional exploration

## Verify with Puppeteer

Use `/puppeteer` to:
1. Enter Greenwash -- navigate all 3 levels via stairs
2. Trigger a flashback -- verify:
   - Screen tints sepia (brownish overlay)
   - Player sprite disappears
   - Flashback NPCs appear and dialog plays
   - After dialog, tint clears and player reappears
3. Screenshot the flashback effect
4. Enter Cotton Tunnel -- fight Carlos trainer battle
5. Pick up items -- verify they appear in inventory
6. Enter Dragon's Cave and Dryad's Grove -- verify encounters
7. Walk through all areas and return

## Done When

- Greenwash 4 areas navigable with flashback sequences working
- Cotton Tunnel playable with Carlos battle and item pickups
- Dragon's Cave and Dryad's Grove with appropriate encounters
- ~10 new species and 3 new items added
- Flashback visual effect (sepia tint + invisible player) works correctly
