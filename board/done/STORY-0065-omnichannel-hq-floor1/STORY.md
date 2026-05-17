# STORY-0065: Omnichannel HQ Floor 1

## Goal

Implement the ground floor of Omnichannel HQ (`spyder_omnichannel1`), the Spyder corporation's headquarters building in Cotton Town. The door teleport already exists in `spyder_cotton_town.yaml` (`Enter Omnichannel HQ` at tile 17,9 → `spyder_omnichannel1.tmx,2,12`) but there is no map, events, or NPC content for it yet.

This is a **clone** of upstream Tuxemon's spyder campaign — lean heavily on the upstream source whenever there are questions about how something should work, how to structure code/content, or what behavior to expect. We are translating Tuxemon from Python to TypeScript, not reinventing it.

Floor 1 is self-contained — the stairs to Floor 2 should not be implemented yet (just leave them out or blocked). The screen/wall barrier mechanic that spans floors 1-2 should also be omitted for now.

## Upstream Reference

- TMX map: `/home/jake/Code/third/tuxemon/mods/tuxemon/maps/spyder_omnichannel1.tmx`
- NPC definitions: `/home/jake/Code/third/tuxemon/mods/tuxemon/db/npc/spyder_omnichannel_npcs.yaml`
- NPC sprites: `/home/jake/Code/third/tuxemon/mods/tuxemon/gfx/sprites/player/`
- Dialogue translations: `/home/jake/Code/third/tuxemon/mods/tuxemon/l18n/en_US/LC_MESSAGES/base.po`
- Monster definitions: `/home/jake/Code/third/tuxemon/mods/tuxemon/db/monster/`

## Upstream Floor 1 Layout (from spyder_omnichannel1.tmx)

14x21 tile indoor map with these events:

| Event | Position | Summary |
|-------|----------|---------|
| Play Music | (0,0) | `music_omnichannel` |
| Environment | (1,0) | Set environment to `interior` |
| Teleport to Cotton Town | (1,13) 2-wide | Exit → `spyder_cotton_town.tmx,17,10` |
| Teleport to Omnichannel 2 | (1-2,9) | **SKIP** — stairs to floor 2, not implemented yet |
| Create William | (9,4) | Trainer; only if not defeated |
| Talk William | behav talk | Battle: Elowind Lv36 + Cardiwing Lv36 |
| Spot Enforcer | (1,12) 2-wide | Scripted cutscene on first entry (before `hospitalcure` var) |
| Battle Enforcer | (1,10) 2-wide | Battle: Rabbitosaur Lv35 (after cutscene) |
| Create Maniac/Ethan | (2,2) | Flavor NPC |
| Talk Maniac | behav talk | Dialog: `spyder_omnichannel_maniac` |
| Create Nurse/Danita | (2,17) | Quest NPC — gives `spyder_pass` item |
| Talk Nurse | behav talk | Dialog + award `spyder_pass` + set `nurse_spyder:yes` |
| Create Spyder Rookie/Talbot | (12,11) | Flavor NPC, faces left |
| Talk Spyder Rookie | behav talk | Dialog: `spyder_omnichannel1_spyderrookie` |
| Create Screen | (7,18) | **SKIP** — barrier mechanic tied to Floor 2 PC |
| Remove Screen / Pass1 | | **SKIP** — part of screen barrier mechanic |
| Threats (random encounters) | | **SKIP** — gated behind `omnichannel1wall` var which is set on Floor 2 |

## NPC Sprites Needed

These sprites are used by Floor 1 NPCs but don't exist in `public/assets/sprites/` yet. Copy them from upstream:

| NPC | Upstream sprite_name | Upstream path | Our fallback if missing |
|-----|---------------------|---------------|------------------------|
| William | `beachcomber_black` | `/home/jake/Code/third/tuxemon/mods/tuxemon/gfx/sprites/player/beachcomber_black.png` | `beachcomber` |
| Enforcer | `knight` | Already exists as `knight.png` | — |
| Ethan (Maniac) | `maniac_yellow` | `/home/jake/Code/third/tuxemon/mods/tuxemon/gfx/sprites/player/maniac_yellow.png` | `maniac` |
| Danita (Nurse) | `nurse` | `/home/jake/Code/third/tuxemon/mods/tuxemon/gfx/sprites/player/nurse.png` | `shopassistant` |
| Talbot (Rookie) | `spyderrookie` | `/home/jake/Code/third/tuxemon/mods/tuxemon/gfx/sprites/player/spyderrookie.png` | `maniac` |

Check each upstream sprite exists and has the right dimensions (48x128 = 3 columns x 4 rows of 16x32 frames). If an upstream sprite doesn't exist or has wrong dimensions, use the fallback.

## Monsters Needed

The trainer battles use monsters not yet in our registry:

| Monster | Level | Used by | Upstream def path |
|---------|-------|---------|-------------------|
| `elowind` | 36 | William | `/home/jake/Code/third/tuxemon/mods/tuxemon/db/monster/elowind.json` |
| `cardiwing` | 36 | William | `/home/jake/Code/third/tuxemon/mods/tuxemon/db/monster/cardiwing.json` |
| `rabbitosaur` | 35 | Enforcer | `/home/jake/Code/third/tuxemon/mods/tuxemon/db/monster/rabbitosaur.json` |

Pull base stats, moves, and evolution data from the upstream JSON files. Also copy their front/back battle sprites from upstream (`/home/jake/Code/third/tuxemon/mods/tuxemon/gfx/sprites/battle/`) into `public/assets/sprites/battle/`. Follow the same patterns used by existing monsters in `src/game/data/monsters.ts`.

## Items Needed

The nurse gives the player a `spyder_pass` key item. Our item system currently only has consumables and "other" items. Add a `spyder_pass` item:
- Upstream description: "This should let you in to places only Spyder conspirators are meant to go."
- Category: `"other"`
- Not usable in combat or overworld — it's a passive key item checked via `has_item`

## Dialogue

Most upstream omnichannel dialogue keys have **empty translations** in `base.po`. Write reasonable placeholder dialogue that fits the character and context:

- **Enforcer (cutscene)**: Intimidating, warns the player they shouldn't be here, then attacks.
- **Enforcer (post-battle)**: Grudgingly lets the player pass after losing.
- **William (pre-battle)**: Confident Spyder trainer, challenges the player.
- **William (post-battle)**: Surprised at losing.
- **Maniac/Ethan**: Eccentric character, flavor text about Omnichannel being strange.
- **Nurse/Danita**: Helpful, explains the Spyder Pass and gives it to the player.
- **Talbot/Rookie**: Junior Spyder member, nervous flavor dialogue.

Keep dialogue brief and in-character. 1-3 lines per interaction.

## Key Patterns

- **Map registration**: Add to `MAP_REGISTRY` in `src/game/data/maps.ts` with `inside: true`
- **Event preload**: Add `this.load.text("events-spyder_omnichannel1", "assets/events/spyder_omnichannel1.yaml")` in `src/game/scenes/OverworldScene.ts`
- **NPC registration**: Add entries in `src/game/data/npcs.ts` with `{ spritesheet: "..." }`
- **NPC parties** (for trainers only): Add to `src/game/data/npcParties.ts`
- **Event YAML format**: See `public/assets/events/spyder_cotton_cafe.yaml` and `spyder_cotton_town.yaml` for reference
- **Map export**: Export upstream TMX via Tiled CLI (`tiled --export-map --embed-tilesets input.tmx output.json`), then post-process: decode base64/zlib tile data to integer arrays and fix image paths to just filenames. See existing maps for the expected JSON structure.
- **Monster registration**: Follow existing entries in `src/game/data/monsters.ts` — match the `MonsterDef` shape.

## Workflow for each TODO

For every TODO below:
1. Implement the changes described
2. **Use `/puppeteer` to QA** — launch the game, teleport to the map, take screenshots, verify the map renders correctly and interactions work. Iterate until QA passes — if something looks wrong or doesn't work, fix it and re-test before moving on.
3. Run `npm run format:check && npm run lint && npx tsc --noEmit && npm test` and fix any issues
4. Commit the working result before moving to the next TODO

---

## Todos

### 1. Add missing NPC sprites

Copy these sprites from upstream into `public/assets/sprites/`:
- `beachcomber_black.png` from `/home/jake/Code/third/tuxemon/mods/tuxemon/gfx/sprites/player/beachcomber_black.png`
- `nurse.png` from `/home/jake/Code/third/tuxemon/mods/tuxemon/gfx/sprites/player/nurse.png`
- `spyderrookie.png` from `/home/jake/Code/third/tuxemon/mods/tuxemon/gfx/sprites/player/spyderrookie.png`
- `maniac_yellow.png` from `/home/jake/Code/third/tuxemon/mods/tuxemon/gfx/sprites/player/maniac_yellow.png`

Check each sprite's dimensions — they should be 48x128 (3 columns x 4 rows of 16x32 frames) to match our existing format. If a sprite doesn't exist upstream or has wrong dimensions, use the fallback listed in the table above instead (just reference the existing sprite name in the NPC registry, no copy needed).

The `knight.png` sprite (for Enforcer) already exists — no action needed.

**QA**: Use `/puppeteer` to confirm sprites load without errors. Spawn a test NPC with one of the new spritesheets and screenshot it.

### 2. Add missing monsters (elowind, cardiwing, rabbitosaur)

Add the three monsters needed for Floor 1 trainer battles to the monster registry.

**For each monster:**
1. Read the upstream JSON definition at `/home/jake/Code/third/tuxemon/mods/tuxemon/db/monster/{slug}.json`
2. Extract: name, base stats (hp, melee, ranged, armour, dodge, speed — map these to our hp/attack/defense/speed as other monsters do), catch rate, moveset, and evolution chain
3. Add the entry to `src/game/data/monsters.ts` following the `MonsterDef` shape
4. Copy front and back battle sprites from `/home/jake/Code/third/tuxemon/mods/tuxemon/gfx/sprites/battle/{slug}-front.png` and `{slug}-back.png` into `public/assets/sprites/battle/`. Check upstream for the exact filenames — they may vary.

For movesets, only include moves that already exist in our `techniques.ts`. If a monster's upstream moveset references moves we don't have, substitute with similar moves from our existing pool (match by type/power level). Every monster needs at least one move at level 1.

**QA**: Use `/puppeteer` to start a wild encounter or test battle featuring one of the new monsters. Screenshot to confirm the battle sprites render. Verify the monster has working moves.

### 3. Add spyder_pass item

Add the `spyder_pass` to `src/game/data/items.ts`:

```ts
spyder_pass: {
  slug: "spyder_pass",
  name: "Spyder Pass",
  description: "This should let you in to places only Spyder conspirators are meant to go.",
  category: "other",
  sprite: "item/spyder_pass",
  usableIn: [],
  effects: [],
  buyPrice: 0,
},
```

If a sprite is needed, check what other `"other"` category items use and follow the same pattern. If there's no suitable sprite, use a generic one.

**QA**: Use `/puppeteer` to verify the item can be added to inventory via the debug bridge and appears correctly.

### 4. Export and register the Omnichannel 1 map

**Map JSON**: Export `/home/jake/Code/third/tuxemon/mods/tuxemon/maps/spyder_omnichannel1.tmx` to `public/assets/maps/spyder_omnichannel1.json` using Tiled CLI:
```bash
tiled --export-map --embed-tilesets /home/jake/Code/third/tuxemon/mods/tuxemon/maps/spyder_omnichannel1.tmx public/assets/maps/spyder_omnichannel1.json
```
Then post-process: decode any base64/zlib tile data to plain integer arrays, and fix tileset image paths to be just filenames (not full paths). Look at how existing maps like `spyder_cotton_house1.json` are structured and match that format.

Check which tilesets the TMX uses and make sure we have them registered. The upstream map uses:
- `Office_interiors_shadowless_16x16`
- `Interiors_16x16`
- `core_indoor_stairs`
- `Tilesets_16x16`

Verify these tilesets exist in our `public/assets/tilesets/` directory and in `src/game/data/maps.ts` tileset constants. If any are missing, copy the tileset PNGs from upstream and add the corresponding tileset entries.

**Register map** in `src/game/data/maps.ts` — follow the pattern of other indoor maps. Set `inside: true`.

**Add event preload** in `src/game/scenes/OverworldScene.ts`.

**QA**: Use `/puppeteer` to teleport directly to `spyder_omnichannel1` (e.g. `setupGame(page, { map: "spyder_omnichannel1", tileX: 2, tileY: 12 })`). Screenshot to confirm the map renders with correct tiles. Walk around to verify collision layers work. The map should look like a corporate interior.

### 5. Create events — NPC spawns and basic dialogue

Create `public/assets/events/spyder_omnichannel1.yaml` with:

**Music and environment:**
- Play `music_omnichannel` (if this music track doesn't exist in our assets, use `music_cathedral_theme` as a fallback — check `public/assets/music/` first)
- Set environment to `interior`

**NPC spawns (matching upstream positions):**
- Ethan/Maniac at (2,2) — flavor NPC
- William at (9,4) — trainer, only spawn if not defeated
- Talbot/Rookie at (12,11) facing left — flavor NPC
- Danita/Nurse at (2,17) — quest NPC

**Register all NPCs** in `src/game/data/npcs.ts`:
- `spyder_omnichannel_william: { spritesheet: "beachcomber_black" }` (or fallback)
- `spyder_omnichannel_enforcer: { spritesheet: "knight" }`
- `spyder_omnichannel_ethan: { spritesheet: "maniac_yellow" }` (or fallback `"maniac"`)
- `spyder_omnichannel_danita: { spritesheet: "nurse" }` (or fallback `"shopassistant"`)
- `spyder_omnichannel_talbot: { spritesheet: "spyderrookie" }` (or fallback `"maniac"`)

**Basic talk behaviors:**
- Ethan: "This place gives me the creeps. Have you seen the things they keep in the basement?"
- Talbot: "I-I just started here last week. They said the benefits were good, but nobody mentioned the monsters..."
- Danita (before giving pass): "You look like you could use some help getting around. Here, take this — it's a Spyder Pass. It'll get you through the restricted areas." → award `spyder_pass` item → set `nurse_spyder:yes`. After giving pass: "Be careful up there. Not everyone in Omnichannel is as friendly as me."

Do NOT add William battle, enforcer cutscene, or exit teleport yet — those are separate todos.

**QA**: Use `/puppeteer` to teleport to the map. Verify all 4 NPCs appear at correct positions. Interact with each — confirm dialogue shows. Talk to Danita, confirm `spyder_pass` is awarded. Screenshot each NPC interaction.

### 6. Exit teleport and William trainer battle

**Exit teleport:**
Add exit at tiles (1,13) width 2, facing down → `spyder_cotton_town.tmx,17,10`

**William trainer battle:**

Register William's party in `src/game/data/npcParties.ts`:
```ts
spyder_omnichannel_william: {
  name: "William",
  monsters: [
    { slug: "elowind", level: 36 },
    { slug: "cardiwing", level: 36 },
  ],
  goldReward: 500,
},
```

Add talk behavior for William matching upstream pattern:
- Pre-battle (if not defeated): "You think you can just waltz into Omnichannel? Let me show you how we deal with intruders!" → `start_battle player,spyder_omnichannel_william`
- Post-battle (if defeated): "Hmph. You're stronger than you look. Fine, go ahead."

William should only spawn if not yet defeated (condition: `not battle_outcome player,won,spyder_omnichannel_william`).

**QA**: Use `/puppeteer` to:
1. Enter Omnichannel from Cotton Town via the door at (17,9). Confirm teleport works.
2. Talk to William, confirm battle starts with Elowind and Cardiwing.
3. After winning, confirm William disappears and exit teleport returns to Cotton Town at (17,10).
Screenshot each step.

### 7. Enforcer cutscene and battle

This is the most complex event — a scripted encounter when the player first enters.

**Spot Enforcer cutscene** (triggered at tiles 1,12 width 2):
Conditions: `not variable_set hospitalcure:yes` AND `is char_at player`
Actions matching upstream:
1. `char_stop player` + `lock_controls`
2. `create_npc spyder_omnichannel_enforcer,8,7`
3. `pathfind spyder_omnichannel_enforcer,3,12`
4. `unlock_controls`
5. `char_face player,right`
6. Dialog: "Hey! You're not supposed to be in here. This is Omnichannel property!"
7. `char_face player,down`
8. `pathfind player,2,13` (push player back toward exit)
9. `remove_npc spyder_omnichannel_enforcer`

**Battle Enforcer** (triggered at tiles 1,10 width 2):
Conditions: `not battle_outcome player,won,spyder_omnichannel_enforcer` AND `is char_at player` AND `not char_defeated player`
Actions matching upstream:
1. `char_stop player` + `lock_controls`
2. `create_npc spyder_omnichannel_enforcer,4,3`
3. `pathfind spyder_omnichannel_enforcer,3,10`
4. `unlock_controls`
5. `char_face player,right`
6. Dialog: "Back again? This time I won't go easy on you!"
7. Battle: Rabbitosaur Lv35

Register enforcer party in `src/game/data/npcParties.ts`:
```ts
spyder_omnichannel_enforcer: {
  name: "Enforcer",
  monsters: [
    { slug: "rabbitosaur", level: 35 },
  ],
  goldReward: 350,
},
```

8. Post-battle dialog: "Tch... fine. You've earned your way in. But don't think this is over."
9. `pathfind spyder_omnichannel_enforcer,2,12` + `remove_npc`

**QA**: Use `/puppeteer` to test the full sequence:
1. Enter Omnichannel for the first time. Confirm the Spot Enforcer cutscene plays — enforcer walks up, warns you, pushes you back to the exit.
2. Re-enter. Confirm the Battle Enforcer triggers — enforcer appears, battle starts with Rabbitosaur Lv35.
3. After winning, confirm the enforcer is gone on subsequent visits.
Screenshot the cutscene, the battle start, and the post-battle state.

### 8. Integration test — enter from Cotton Town

Walk the player from Cotton Town into Omnichannel HQ via the front door. Verify the full experience:
1. Door entry from Cotton Town works
2. Map renders correctly (corporate interior look)
3. Enforcer cutscene fires on first entry
4. Can return and defeat the enforcer
5. All NPCs are interactable with dialogue
6. Nurse gives `spyder_pass`
7. William battle works
8. Exit returns to correct Cotton Town position

**QA**: Use `/puppeteer` with `setupGame(page, { map: "spyder_cotton_town", tileX: 17, tileY: 10 })`. Walk up one tile to enter Omnichannel. Play through the full floor. Screenshot at each major interaction point. Confirm no visual glitches or broken transitions.

## Acceptance Criteria

- [ ] Omnichannel 1 map renders correctly as a corporate interior
- [ ] All 5 NPC sprites load correctly (William, Enforcer, Ethan, Danita, Talbot)
- [ ] 3 new monsters (elowind, cardiwing, rabbitosaur) are in the registry with battle sprites
- [ ] Door entry from Cotton Town teleports into Omnichannel correctly
- [ ] Exit teleport returns to Cotton Town at (17,10)
- [ ] Enforcer cutscene plays on first entry (pushes player back)
- [ ] Enforcer battle triggers on re-entry (Rabbitosaur Lv35)
- [ ] William trainer battle works (Elowind + Cardiwing Lv36)
- [ ] Nurse/Danita gives `spyder_pass` item with dialogue
- [ ] Ethan and Talbot have flavor dialogue
- [ ] `npm run format:check && npm run lint && npx tsc --noEmit && npm test` passes
