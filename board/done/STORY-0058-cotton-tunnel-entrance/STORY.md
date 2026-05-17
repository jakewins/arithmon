# STORY-0058: cotton-tunnel-entrance

## Description

Cotton Town currently has no way to reach the Cotton Tunnel — the map and basic event file exist (`spyder_cotton_tunnel.json`, `spyder_cotton_tunnel.yaml`) but there's no entrance event in `cotton_town.yaml`. In upstream Tuxemon, the tunnel is a key hub connecting Cotton Town to Dragon's Cave, Dryad's Grove, Greenwash, and Nimrod Bottom.

The goal is to add the full Cotton Tunnel content that upstream Tuxemon uses: entrance from Cotton Town, NPCs, trainer battles, item pickups, and gated exits.

## What Upstream Tuxemon Has

**Entrance:** From Cotton Town at roughly (2, 36) facing up → tunnel at (35, 3). One of our "locked doors" should become this entrance.

**NPCs (9 total):**
- `spyder_cottontunnel_professor` (sprite: professor_fiery) — informational dialog
- `spyder_cottontunnel_shopassistant` (sprite: shopassistant_black) — flavor NPC
- `spyder_cottontunnel_carlos` (sprite: dragonrider_black) — trainer battle (Agnidon x2 + Legko x2, level 35)
- Several Dragon's Cave NPCs (angrybrute, benden, concernedbrute, lazybrute)

**Item Boxes (6):**
- Petrified Dung, Candy Tuxeball, Imperial Tea, Imperial Potion, Cureall, Raise Melee

**Wild Encounters:**
- Day: Boltnu (Lv 25-35), Metesaur (Lv 30-35) — 3.5% rate each
- Night: Dinoflop (Lv 25-40), Furnursus (Lv 30-35) — 3.5% rate each

**Exits:**
- West → Greenwash (`spyder_greenwash.tmx`)
- North → Dragon's Cave (`spyder_dragonscave.tmx`) — **gated behind `dragonscavedrokoro:yes` variable**
- South → Dryad's Grove (`spyder_dryadsgrove.tmx`)
- East → Nimrod Bottom (`spyder_nimrod_bottom.tmx`)

**Upstream source:** `https://raw.githubusercontent.com/Tuxemon/Tuxemon/development/mods/tuxemon/maps/spyder_cotton_tunnel.yaml`

## Implementation Tasks

1. **Add entrance event in `cotton_town.yaml`** — Convert one of the locked doors (likely "Locked Door West" at x:5, y:22) into a transition_teleport to `spyder_cotton_tunnel.tmx`.

2. **Expand `spyder_cotton_tunnel.yaml`** — The current file only has encounters and basic exits. Add:
   - NPC spawns for professor, shopassistant, carlos, and brutes
   - Carlos trainer battle (pre/post dialog + `start_battle`)
   - Item box interactions (use `add_item` + `set_variable` to track picked-up boxes)
   - Conditional gate on Dragon's Cave exit (check `dragonscavedrokoro:yes`)

3. **Register missing NPCs** in `src/game/data/npcs.ts` — Add spritesheet entries for `spyder_cottontunnel_professor`, `spyder_cottontunnel_shopassistant`, `spyder_cottontunnel_carlos`, and brute NPCs.

4. **Register Carlos's party** in `src/game/data/npcParties.ts` — Agnidon x2 + Legko x2 at level 35.

5. **Add missing items** to `src/game/data/items.ts` — Petrified Dung, Candy Tuxeball, Imperial Tea, Imperial Potion, Cureall, Raise Melee (check upstream `mods/tuxemon/db/item/` for effect definitions).

6. **Update encounter table** in `src/game/data/encounters.ts` — Verify `spyder_cotton_tunnel` entries match upstream (day/night split if time system supports it; otherwise use all encounters equally).

7. **Add missing monster species** if Boltnu, Metesaur, Dinoflop, Furnursus, Agnidon, Legko aren't in the monster registry yet.

8. **Verify map tile collision** — Ensure the tunnel map's collision layer properly blocks movement except along intended paths.

## Acceptance Criteria

- [ ] Player can enter Cotton Tunnel from Cotton Town (one of the locked doors becomes the entrance)
- [ ] Cotton Tunnel contains NPCs with dialog matching upstream content
- [ ] Carlos trainer battle works (pre-battle taunt, battle, post-battle dialog)
- [ ] Item boxes are interactable and give items (one-time pickup tracked by variables)
- [ ] All four exits from the tunnel work (west/north/south/east)
- [ ] Dragon's Cave exit is gated behind a variable (shows "locked" message if not set)
- [ ] Wild encounters trigger while walking in the tunnel
- [ ] Verified via QA script: enter tunnel from Cotton Town, interact with NPC, pick up item, exit
