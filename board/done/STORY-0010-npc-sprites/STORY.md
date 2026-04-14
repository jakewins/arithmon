# STORY-0010: Use Tuxemon NPC sprites instead of player spritesheet

## Description

All NPCs currently reuse the player spritesheet (`adventurer.png`), so every character looks identical. Tuxemon's sprite assets (CC BY-SA 4.0) use the exact same format we already support — 48x128 PNG spritesheets with 3 columns × 4 rows of 16x32 frames (down/left/right/up, walk1/idle/walk2). We can drop them straight in.

The hacker NPC in the Cotton Town scenario uses Tuxemon's `magician.png` sprite. The greeter can use a different sprite to visually distinguish them.

### What Tuxemon does

In Tuxemon, each NPC has a `template` in `db/npc/*.yaml` with a `sprite_name` field pointing to a PNG in `mods/tuxemon/sprites/`. The spritesheet layout is:

| Row | Direction |
|-----|-----------|
| 0   | Down (front) |
| 1   | Left |
| 2   | Right |
| 3   | Up (back) |

Columns: walk1, idle, walk2. Walk animation: idle → walk1 → idle → walk2.

This matches our existing player spritesheet format exactly.

### Tasks

1. **Copy sprite assets** from Tuxemon repo
   - `magician.png` → `public/assets/sprites/magician.png` (for the hacker NPC)
   - Pick a second sprite for the greeter (e.g. `shopkeeper.png` or another Tuxemon NPC sprite)
   - Add a `LICENSES` or attribution note in `public/assets/sprites/` for CC BY-SA 4.0

2. **Preload NPC spritesheets in OverworldScene**
   - Load each spritesheet referenced in `data/npcs.ts` during `preload()`
   - Use the same `frameWidth: 16, frameHeight: 32` config as the player

3. **Update NPC sprite registry** (`data/npcs.ts`)
   - `hacker` → `{ spritesheet: "magician", frame: 1 }`
   - `greeter` → `{ spritesheet: "<chosen sprite>", frame: 1 }`
   - Fallback remains the player spritesheet

4. **Wire registry into `create_npc` action**
   - Import `getNpcSprite()` from `data/npcs.ts`
   - Use the returned spritesheet key and frame instead of hardcoding `"player"`

5. **Update OverworldScene greeter creation**
   - Use the registry to pick the greeter's spritesheet instead of `"player"`

6. **Create walk animations per NPC spritesheet**
   - NPCs that pathfind (like the hacker) need walk animations registered for their spritesheet
   - Either register animations on-demand when an NPC is created, or preregister for known spritesheets

## Acceptance Criteria

- [ ] Hacker NPC uses the magician sprite (visually distinct from player)
- [ ] Greeter NPC uses a different sprite (not the player or hacker)
- [ ] Tuxemon sprite attribution is present in the assets directory
- [ ] `create_npc` action uses the NPC registry to pick sprites
- [ ] All code passes formatter, linter, typecheck, and tests
