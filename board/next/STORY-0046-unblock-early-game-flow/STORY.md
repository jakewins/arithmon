# STORY-0046: Unblock Early Game Flow

## Description

The player currently gets stuck after going downstairs — there are no events on `spyder_downstairs`, so there's no door to exit, no Mom dialog, and no way to reach Paper Town on foot. This epic unblocks the path from bedroom all the way through Route 1 to Cotton Town, and adds a healing center so the player can recover after battles.

**Goal**: a player can wake up, talk to Mom, walk outside to Paper Town, travel Route 1 (with wild encounters and an NPC), and arrive at Cotton Town where they can heal.

### Alignment with Tuxemon

We are closely following the [Tuxemon](https://github.com/Tuxemon/Tuxemon) Spyder campaign. When implementing maps, events, NPCs, and encounters, **always check the corresponding Tuxemon source files first** and replicate their structure where appropriate:

- **Maps**: `mods/tuxemon/maps/spyder_*.tmx` — use these as the source for our Tiled maps, keeping tile coordinates, layer structure, and object placement aligned
- **NPCs**: `mods/tuxemon/db/npc/spyder_*_npcs.yaml` — match NPC slugs, sprites, and placement
- **Encounters**: `mods/tuxemon/db/encounter/spyder_*.yaml` — replicate encounter tables per route
- **Dialogue**: `mods/tuxemon/db/dialogue.yaml` — use as reference for dialog keys and text
- **Events**: embedded in TMX object layers — replicate event names, conditions, and actions in our YAML format

Keeping our structure closely aligned with Tuxemon makes it easy to diff, compare, and expand as we implement more of the campaign.

### QA Process

After completing each todo, **use the `/puppeteer` tool to visually verify the changes in a real browser** before committing. Take screenshots showing the new functionality works. Only commit and move to the next todo once puppeteer QA confirms everything is working.

## Todos

Work through these in order:

1. [Exit the house](todos/open/01-exit-the-house.md) — Create `spyder_downstairs.yaml` with Mom, TV, door to Paper Town
2. [Paper Town connections](todos/open/02-paper-town-connections.md) — Wire up bidirectional door between Paper Town and the house
3. [Route 1 map](todos/open/03-route1-map.md) — Create the Route 1 map connecting Paper Town to Cotton Town
4. [Route 1 events](todos/open/04-route1-events.md) — Wild encounters, Bjorn NPC, signs, map transitions
5. [Healing center](todos/open/05-healing-center.md) — Create healing center map in Cotton Town with party healing

## Acceptance Criteria

- [ ] Player can go downstairs, talk to Mom, and exit the house to Paper Town
- [ ] Player can walk from Paper Town north to Route 1
- [ ] Route 1 has wild encounters with route-specific monster pools (Pairagrin, Aardorn, Cataspike)
- [ ] Route 1 connects north to Cotton Town
- [ ] Cotton Town has a healing center that fully restores the player's party
- [ ] All map transitions work bidirectionally (can go back and forth)
- [ ] All code passes `npm run format:check && npm run lint && npx tsc --noEmit && npm test`
- [ ] Each todo verified via `/puppeteer` before committing
