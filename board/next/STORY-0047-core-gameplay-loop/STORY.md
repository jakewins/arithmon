# STORY-0047: Core Gameplay Loop

## Description

With STORY-0046 unblocking the map flow from bedroom to Cotton Town, this epic adds the gameplay systems that make the loop *fun*: per-route encounter tables so each area has distinct wild monsters, a shop where the player can buy potions and tuxeballs, route trainers to fight, and Cotton Town fleshed out as a proper hub with doors, NPCs, and connections.

**Goal**: the player has a complete early-game loop — explore routes with varied encounters, fight trainers, buy supplies at shops, heal at the center, and explore Cotton Town's buildings and NPCs.

### Alignment with Tuxemon

We are closely following the [Tuxemon](https://github.com/Tuxemon/Tuxemon) Spyder campaign. When implementing maps, events, NPCs, encounters, and shops, **always check the corresponding Tuxemon source files first** and replicate their structure where appropriate:

- **Maps**: `mods/tuxemon/maps/spyder_*.tmx` — use as source for Tiled maps
- **NPCs**: `mods/tuxemon/db/npc/spyder_*_npcs.yaml` — match NPC slugs, sprites, placement
- **Encounters**: `mods/tuxemon/db/encounter/spyder_*.yaml` — replicate per-route encounter tables
- **Economy/Shops**: `mods/tuxemon/db/economy/spyder_*.yaml` — match shop inventories and pricing
- **Dialogue**: `mods/tuxemon/db/dialogue.yaml` — use for dialog keys and text
- **Events**: embedded in TMX object layers — replicate in our YAML format
- **Monsters**: `mods/tuxemon/db/monster/*.yaml` — add new species as needed for encounter tables

Keeping our structure closely aligned makes it easy to diff, compare, and expand.

### QA Process

After completing each todo, **use the `/puppeteer` tool to visually verify the changes in a real browser** before committing. Take screenshots showing the new functionality works. Only commit and move to the next todo once puppeteer QA confirms everything is working.

## Todos

Work through these in order:

1. [Per-route encounter tables](todos/open/01-per-route-encounters.md) — Configure which wild monsters appear on which maps at which levels
2. [New monster species](todos/open/02-new-monster-species.md) — Add Pairagrin, Aardorn, Cataspike, Cardiling, Eyenemy for route encounters
3. [Money and currency](todos/open/03-money-and-currency.md) — Add gold to the player, earn from battles, display in UI
4. [Shop system](todos/open/04-shop-system.md) — Implement `open_shop` action and shop UI for buying/selling items
5. [Cotton Scoop shop](todos/open/05-cotton-scoop-shop.md) — Create Cotton Scoop interior map with shopkeeper, wire up shop events
6. [Route trainers](todos/open/06-route-trainers.md) — Add trainers to Route 1 and Paper Town with parties and battle events
7. [Cotton Town hub](todos/open/07-cotton-town-hub.md) — Add doors, signs, NPCs, and connections to Cotton Town

## Acceptance Criteria

- [ ] Wild encounters on Route 1 draw from route-specific pool (Pairagrin, Aardorn, Cataspike L2-4)
- [ ] At least 5 new monster species added matching Tuxemon's route encounter tables
- [ ] Player earns gold from winning battles
- [ ] Player can buy and sell items at a shop via `open_shop` action
- [ ] Cotton Scoop map exists with shopkeeper selling potions, tuxeballs, revives
- [ ] At least 2 route trainers with defined parties are fightable
- [ ] Cotton Town has working doors to healing center, Cotton Scoop, and at least one house
- [ ] Cotton Town has signs and NPC dialog
- [ ] All code passes `npm run format:check && npm run lint && npx tsc --noEmit && npm test`
- [ ] Each todo verified via `/puppeteer` before committing
