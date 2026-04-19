# STORY-0050: Spyder Campaign World Port

## Description

With STORY-0049 giving us a complete event engine, this story ports all remaining maps, NPCs, monsters, items, and encounters from the upstream Tuxemon Spyder campaign. We currently have **11 maps** covering Paper Town → Route 1 → Cotton Town. The full campaign has **80+ maps** spanning 25+ distinct areas, ~50 monster species, dozens of trainers, and a full progression from Paper Town through the endgame Data Center.

### Campaign Progression Map

The Spyder campaign follows this flow (areas we have are marked with check):

```
[x] Paper Town (home) → [x] Route 1 → [x] Cotton Town
                                            ↓
[ ] Route 2 → [ ] City Park → [ ] Route 3 → [ ] Mansion (dungeon)
                                                    ↓
[ ] Route 4 → [ ] Timber Town → [ ] Route 5 → [ ] Route 6
    ↓                                                ↓
[ ] Route A                                  [ ] Leather Town
                                                    ↓
[ ] Flower City → [ ] Dojo → [ ] Candy Town (port hub)
                                    ↓           ↓
                              [ ] Greenwash  [ ] Diamond Hill
                                    ↓
                              [ ] Cotton Tunnel → [ ] Dragon's Cave / Dryad's Grove
                                    ↓
                              [ ] Nimrod → [ ] Data Center (endgame)
```

### What Needs Porting

**Maps (~70 new):** Each area has a main outdoor map plus interior buildings (shops, cafes, healing centers, houses). Total breakdown by region:
- Paper Town interiors: manor, daycare, rival house (3 floors) = 5 maps
- Route 2 + City Park = 2 maps
- Route 3 + Mansion (3 floors) = 4 maps
- Route 4 + Route A = 2 maps
- Timber Town + buildings = ~6 maps
- Route 5 + Route 6 = 2 maps
- Leather Town + buildings (gym, museum, mine shafts) = ~7 maps
- Flower City + buildings (pet shop, houses) = ~6 maps
- Dojo (4 floors) = 4 maps
- Candy Town + buildings (port, inn, cafe, hospital) = ~10 maps
- Greenwash (4 areas) = 4 maps
- Cotton Tunnel + Dragon's Cave + Dryad's Grove = 3 maps
- Nimrod (4 areas) = 4 maps
- Route B, C + Diamond Hill + misc = ~5 maps

**Monsters (~40 new species):** Later routes introduce progressively stronger species. Key additions: Axolightl, Elofly, Squabbit, Shybulb, Katapill, Anoleaf, Cairfrey, Polyrock, Djinnbo, Sapsnap, Foofle, Vamporm, Dracune, Dandicub, Dandylion, Capiti, Toufigel, Pipis, Strella, Agnite, Agnidon, Embra, Coleorus, Tourbidi, Dinoflop, Furnursus, Boltnu, Metesaur, Pythwire, Ouroboutlet, Sockeserp, and more.

**Items (~10 new):** Cureall, Imperial Potion, Imperial Tea, Surfboard, various key items.

**NPCs/Trainers (~30+ new):** Each route has trainers, each town has NPCs with dialog profiles.

### Visual Reference

Screenshots from the Tuxemon wiki for how areas should look:

- **Paper Town**: `https://wiki.tuxemon.org/images/e/e4/Paper_town.png` -- Rustic starting town with log cabins, blue-roofed shop, wooden dock/pier on waterfront
- **Cotton Town**: `https://wiki.tuxemon.org/images/0/08/Cotton_town.png` -- Hub town with glass Omnichannel building, red healing center, blue shop, cafe, park with fountain
- **Timber Town**: `https://wiki.tuxemon.org/images/9/9e/Timber_Town.png` -- Stone castle/cathedral, red center, ferry building on water, fountain
- **Route 1**: `https://wiki.tuxemon.org/images/e/ee/Route_1.png` -- Dense forest with tall grass patches, lake, mushrooms
- **Battle screen**: `https://wiki.tuxemon.org/images/3/37/Battle_screen.png` -- Green jungle background, monsters on platforms
- **Healing Center**: `https://wiki.tuxemon.org/images/9/9c/Healing_center.png` -- Blue counters, healing machine, computer
- **Scoop Store**: `https://wiki.tuxemon.org/images/1/13/Scoop_Store_-_Paper_Town.png` -- Wooden floors, glass display counter
- **Cafe**: `https://wiki.tuxemon.org/images/6/6c/Cafe_-_Cotton_Town.png` -- Warm tiles, wooden tables
- **Regional overview**: `https://wiki.tuxemon.org/images/2/28/New_spyder_map.png` -- Stylized overview of the Fondent region

### Alignment with Tuxemon

For every map and event, **always check the corresponding upstream source first**:
- **Maps**: `mods/tuxemon/maps/spyder_*.tmx` -- Export TMX to our JSON format
- **Events**: `mods/tuxemon/maps/spyder_*.yaml` -- Port to our `public/assets/events/` format
- **NPCs**: `mods/tuxemon/db/npc/spyder_*_npcs.yaml` -- Match slugs, sprites, placement
- **Encounters**: `mods/tuxemon/db/encounter/spyder_*.yaml` -- Replicate tables
- **Economy**: `mods/tuxemon/db/economy/spyder_*.yaml` -- Match inventories
- **Monsters**: `mods/tuxemon/db/monster/*.yaml` -- Stats, movesets, evolutions
- **Dialogue**: `mods/tuxemon/l18n/en_US/LC_MESSAGES/base.po` -- All 1,464 Spyder dialog strings

### QA Process

After completing each todo, **use the `/puppeteer` tool to visually verify the maps and events** before committing. Walk through each new area, interact with NPCs, verify doors and transitions work.

## Todos

Work through these in order. Each todo represents a region of the campaign:

1. [Paper Town completion](todos/open/01-paper-town-completion.md) -- Add missing interiors (manor, daycare, rival house)
2. [Route 2 and City Park](todos/open/02-route2-and-citypark.md) -- New route with encounters, city park area
3. [Mansion dungeon](todos/open/03-mansion-dungeon.md) -- Route 3 + 3-floor dungeon
4. [Timber Town region](todos/open/04-timber-town-region.md) -- Routes 4/A + town + buildings
5. [Leather Town region](todos/open/05-leather-town-region.md) -- Routes 5/6 + town + gym + museum + mine
6. [Flower City and Dojo](todos/open/06-flower-city-and-dojo.md) -- Town + pet shop + 4-floor dojo
7. [Candy Town and port](todos/open/07-candy-town-and-port.md) -- Town + inn + cafe + hospital + river transport
8. [Greenwash and tunnels](todos/open/08-greenwash-and-tunnels.md) -- Greenwash lab + Cotton Tunnel + Dragon's Cave + Dryad's Grove
9. [Endgame: Nimrod and Data Center](todos/open/09-endgame-nimrod-datacenter.md) -- Nimrod tower + Data Center + remaining routes
10. [Full campaign playthrough QA](todos/open/10-full-campaign-qa.md) -- Automated walkthrough test of the complete campaign

## Acceptance Criteria

- [ ] All ~80 campaign maps are ported and loadable
- [ ] All map transitions (doors, route edges) connect correctly
- [ ] All encounter tables populated for every route (matching upstream levels/species)
- [ ] All ~50 monster species defined with stats, sprites, and evolution chains
- [ ] All NPCs placed with dialog and trainer parties where appropriate
- [ ] All shops have correct inventories matching upstream economy files
- [ ] Healing centers work with Cathedral billing flow
- [ ] Campaign can be played from bedroom to at least Candy Town without blockers
- [ ] All code passes `npm run format:check && npm run lint && npx tsc --noEmit && npm test`
- [ ] Each todo verified via `/puppeteer` before committing
