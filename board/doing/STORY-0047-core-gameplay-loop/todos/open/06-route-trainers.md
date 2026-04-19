# Todo: Route Trainers

## What

Add trainer NPCs to Route 1 and ensure Paper Town's Silver battle works as part of the progression. Define NPC parties for route trainers.

## Why

Trainer battles are a core part of the gameplay loop — they're more structured than wild encounters, award more XP and gold, and drive the story forward. The player needs opponents to test their team against.

## Tuxemon Reference

Check `mods/tuxemon/db/npc/` for trainer definitions:

**Route 1**:
- **Bjorn** (beachcomber) — in Tuxemon he's a flavor NPC who runs away, not a trainer. But we could make him a simple trainer for gameplay purposes, or keep him as dialog-only and rely on wild encounters for Route 1 progression.

**Paper Town**:
- **Silver** — already has a battle event in our `spyder_paper_town.yaml`. Check that their party in `npcParties.ts` is appropriate (currently Rockitten L5 + Budaye L4).

**Route 2** (for future reference, not needed now):
- **Roddick** — Spighter L8
- **Marion** — two Aardorn L7
- **Graf** — Cardiling L7, two Cataspike L5

For this todo, focus on making sure the existing Silver battle works well and optionally adding one trainer to Route 1.

## Implementation

1. **Verify Silver's trainer battle** in Paper Town:
   - Silver's party is already in `npcParties.ts` — verify it's balanced for a first fight
   - Walk through the full battle flow: approach → dialog → battle → post-battle dialog
   - Make sure `battle_outcome` condition works for post-battle branching

2. **Optionally add a Route 1 trainer**:
   - If Bjorn should be a trainer, add a party to `npcParties.ts` (e.g., one monster L3)
   - Add battle events to `spyder_route1.yaml`: pre-battle dialog → `start_battle` → post-battle dialog
   - Or keep Bjorn as dialog-only and skip this — Route 1 wild encounters may be enough

3. **Award gold on trainer wins** (ties to money todo 03):
   - Verify that winning a trainer battle awards gold
   - Silver should give a modest amount (first battle)

4. **Verify trainer restrictions work**:
   - Can't flee from trainer battles
   - Can't use capture devices on trainer monsters
   - Trainer's party sends out next monster when one faints

## Verify with Puppeteer

Use `/puppeteer` to:
1. Start game, get starter monster, exit to Paper Town
2. Talk to Silver — verify pre-battle dialog
3. Fight Silver — verify trainer battle restrictions (no flee, no capture)
4. Win — verify post-battle dialog and gold reward
5. Talk to Silver again — verify they have different dialog after defeat
6. If Route 1 trainer added: walk to Route 1, find trainer, fight them
7. Screenshot key moments

## Done When

- Silver's trainer battle in Paper Town works end-to-end
- At least one complete trainer battle is playable in the early game
- Trainer battles award gold
- Post-battle dialog branches correctly based on outcome
- NPC parties are defined and balanced for early game
