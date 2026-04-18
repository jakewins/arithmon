# Todo: Cotton Town Hub

## What

Flesh out Cotton Town as a proper hub — add doors to buildings, signs, NPCs with dialog, and make it feel like a real town the player wants to explore.

## Why

Cotton Town is currently sparse — it has a hacker intro event and a greeter NPC, but no building doors (except what earlier todos added for the healing center and Cotton Scoop). A hub town needs to feel alive with things to see and people to talk to.

## Tuxemon Reference

Check `mods/tuxemon/maps/spyder_cotton_town.tmx` for the full Cotton Town layout and events:

**Building doors** (from Tuxemon's event objects):
- Cotton Scoop (mart) — already added in todo 05
- Healing Center — already added in STORY-0046 todo 05
- Cotton Cafe — at (8,11) area → `spyder_cotton_cafe.tmx` (future map, add the door but don't create the interior yet — just show "Coming soon" dialog or block entry)
- Art Shop — at (2,10) area → `spyder_cotton_artshop.tmx` (future)
- Cotton House 1 — at (6,7) → `spyder_cotton_house1.tmx` (future)
- Cotton House 2 — at (6,7) → `spyder_cotton_house2.tmx` (future)
- Cotton Tunnel — at (35,3) → `spyder_cotton_tunnel.tmx` (future, story-gated)

**Signs**:
- Town sign: "Cotton Town" (already exists in our events)
- Building signs for shops, healing center, etc.
- Route signs at exits

**NPCs**:
- **Monk** at (5,7) — dialog about the town/monsters, conditional on story progress
- Additional flavor NPCs — townspeople with one-liner dialog
- The hacker and greeter already exist in our events

**Route connections**:
- South → Route 1 (added in STORY-0046)
- East → Route 2 (future, add blocked exit or sign saying "Route 2 — Coming Soon")
- West → Dryad's Grove (future)
- Cotton Tunnel → north passage (story-gated, future)

## Implementation

1. **Add building doors** to `cotton_town.yaml`:
   - For buildings with interiors (healing center, Cotton Scoop): teleport events (if not already added by earlier todos)
   - For buildings without interiors yet: "The door is locked" or "This building isn't open yet" dialog on interact
   - Match door tile positions to Tuxemon's map layout

2. **Add signs** to `cotton_town.yaml`:
   - Building signs: "Cotton Scoop — Supplies", "Healing Center", etc.
   - Route signs at exits: "Route 1 — Paper Town", "Route 2 — Flower City" (even if Route 2 isn't accessible yet)

3. **Add NPCs**:
   - **Monk**: spawn near the tavern area, dialog about monsters and the town
   - 1-2 additional townspeople with simple dialog — keeps the town from feeling empty
   - Add NPC slugs to `src/game/data/npcs.ts` with appropriate spritesheets
   - Check Tuxemon's NPC database for sprites and dialog

4. **Add blocked exits** for future routes:
   - East exit (Route 2): either collision blocking or an NPC/sign saying the road is closed
   - This sets up natural progression for later stories

## Verify with Puppeteer

Use `/puppeteer` to:
1. Enter Cotton Town from Route 1
2. Walk around — screenshot the town overview
3. Interact with each building door — verify doors to healing center and Cotton Scoop work, others show appropriate messages
4. Read signs — verify text
5. Talk to NPCs — verify dialog works
6. Try to go east (Route 2 direction) — verify it's blocked or has a message
7. Walk south — verify return to Route 1

## Done When

- Cotton Town has doors for all visible buildings (working or placeholder)
- At least 3-4 signs are readable
- At least 2 NPCs beyond hacker/greeter have dialog
- Future exits are clearly indicated (blocked or signed)
- Town feels like a real hub the player can explore
