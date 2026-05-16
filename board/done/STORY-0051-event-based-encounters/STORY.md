# STORY-0051: event-based-encounters

## Description

Our random encounter system is fundamentally different from upstream Tuxemon and is broken: we hardcode a global grass-tile check (`GRASS_TILE_IDS`) in `OverworldScene.checkEncounter()` that rolls a 10% chance per step on **any** tile with a grass texture. This means towns like Paper Town (67% grass tiles) trigger encounters constantly, making it impossible to walk around and talk to NPCs without being pulled into combat.

**Upstream Tuxemon uses the event system for encounters, not a global tile check.** Encounters are authored as map events with rectangular zones placed in Tiled. Town maps have zero encounter zones. Only route maps have them, and only over specific grassy areas.

### How Tuxemon does it

In upstream Tuxemon, encounters are defined as regular map events in TMX files. For example, `spyder_route1.tmx` has six rectangular encounter zones, each configured like:

```
conditions:
  - is char_moved player       # player just took a step
  - is char_at player          # player is inside this event rectangle
actions:
  - random_encounter spyder_route1,11   # 11% chance, encounter list "spyder_route1"
  - play_map_animation grass,0.1,noloop,player
```

The `random_encounter` action (see `tuxemon/event/actions/random_encounter.py`) takes a zone slug and a total probability (0-100). It rolls `random.uniform(0, 100)` and if the roll is under the probability, picks a monster from the zone's encounter table using weighted `random.choices`.

Key points from upstream:
- **`spyder_paper_town.tmx` has zero encounter events** -- towns are safe
- Encounter zones are manually authored rectangles, not global tile checks
- The `char_moved` condition ensures the check only runs on tile transitions (not every frame)
- The probability parameter is per-zone, so different areas can have different rates

### What to change

1. **Remove the hardcoded encounter system**: Delete `GRASS_TILE_IDS`, `checkEncounter()`, `encounterConfig.ts` (`getEncounterRate`/`setEncounterRate`), and the global grass-tile scanning logic in `OverworldScene`.

2. **Implement the `random_encounter` action** properly (currently stubbed in `src/game/event/actions/randomEncounter.ts`). It should:
   - Accept args: `<encounter_slug>,<total_probability>`
   - Roll a random number 0-100; if >= probability, do nothing
   - Look up the encounter table for the slug (from `src/game/data/encounters.ts`)
   - Pick a monster using weighted selection from the table
   - Start combat with that monster

3. **Implement a `char_moved` condition** (or verify we have an equivalent). Upstream calls it `char_moved` -- it returns true when the character has just completed a tile transition. Our `step_tracker` condition is stubbed and not the right abstraction; we need something that simply returns true on the frame the player changes tiles.

4. **Add encounter zone events to route maps** in their YAML event files. Use the same zones and probabilities as upstream Tuxemon. Paper Town and other town maps should have **no** encounter events.

5. **Clean up `src/game/data/encounters.ts`**: Keep the encounter table data but remove the DEFAULT_POOL fallback -- if a map has no encounter events, there should be no encounters, period.

## Acceptance Criteria

- [ ] No hardcoded grass-tile encounter logic remains (`GRASS_TILE_IDS`, `checkEncounter`, `encounterConfig.ts` removed)
- [ ] `random_encounter` action is fully implemented (probability roll + weighted monster selection + starts combat)
- [ ] A `char_moved` condition (or equivalent) exists and works for tile transitions
- [ ] Route maps (spyder_route1, etc.) have encounter zone events in their YAML files matching upstream zones/probabilities
- [ ] Town maps (spyder_paper_town, etc.) have no encounter events
- [ ] Use the puppeteer to validate: walk around Paper Town for a while and confirm zero encounters trigger
- [ ] Use the puppeteer to validate: walk around on a route with encounter zones and confirm encounters eventually trigger
