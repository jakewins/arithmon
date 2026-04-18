# STORY-0045: Trainer Battles & Paper Town

## Description

Implement NPC trainer battles — the biggest missing game system — and wire up Paper Town as the first open-world location where the player explores, talks to NPCs, and fights their first trainer.

**Key goal**: extend `CombatMachine` and `CombatScene` to support trainer battles (not just wild encounters), implement the `start_battle` event action, and import Paper Town as the first explorable town after the Paper Scoop tutorial.

**Depends on**: STORY-0043 (Event Engine Expansion) for `battle_outcome` condition, `char_defeated` condition, `add_monster`, and `party_size`. Pairs with STORY-0044 (the player needs a starter monster to fight with).

### How Tuxemon handles trainer battles

In Tuxemon, trainer battles differ from wild encounters in several ways:
- **Initiated via events**: `start_battle` action takes an NPC slug — the NPC must have monsters in their party (defined in NPC YAML files)
- **No fleeing**: player cannot run from trainer battles
- **No capturing**: tuxeballs are disabled against trainer monsters
- **Outcome tracking**: result (won/lost/fled) is stored and queryable via `battle_outcome` condition, keyed by NPC slug
- **Post-battle flow**: events branch on `battle_outcome` to show different dialog (e.g., "Must be a fluke!" on win vs "As expected!" on loss)
- **NPC parties**: defined in `db/npc/*.yaml` files — each NPC has a `monsters` list with slug and level

### What to build

#### 1. NPC party data

Define a way to give NPCs their own monster parties. Options:
- **Simple approach**: a registry in `data/npcParties.ts` mapping NPC slug → list of `{ slug, level }` entries
- This mirrors Tuxemon's `db/npc/*.yaml` monster definitions
- Only the NPCs who are trainers need entries

For the first trainer battle, we need at least one NPC with a party. Check the Paper Town events to identify who the first opponent is and what monsters they have.

#### 2. Extend CombatMachine for trainer battles

The `CombatMachine` already has an `isWild` flag. For trainer battles:
- Set `isWild = false`
- **Disable fleeing**: `submitAction({ type: "run" })` should always fail with "Can't escape from a trainer battle!"
- **Disable capture**: capture actions should be rejected with "Can't use that in a trainer battle!"
- **Enemy party**: trainers can have multiple monsters. When the enemy's active monster faints, send out the next one (mirror the player's FORCE_SWAP mechanic but for the AI side)
- **Win condition**: all enemy monsters fainted
- **Loss condition**: all player monsters fainted (same as now)

#### 3. Enemy AI for multi-monster battles

Currently the enemy always uses their first technique. For trainer battles with multiple monsters:
- Enemy picks a random technique from their available moves
- When the active enemy faints, the next monster is sent out automatically
- Add new combat events: `enemy_swap_in` for when the trainer sends out the next monster

#### 4. `start_battle` event action

New action in `src/game/event/actions/startBattle.ts`:
- Args: `start_battle npc_slug` (e.g., `start_battle spyder_route1_trainer`)
- Looks up the NPC's party from the registry
- Spawns `Monster` instances from the party definition
- Launches `CombatScene` with `isWild = false` and the full enemy party
- On combat end, stores the outcome in `session.battleOutcomes` (keyed by NPC slug)
- Returns control to the calling event engine after combat resolves

The tricky part is the async flow: `start_battle` launches CombatScene and must wait for it to complete before the event engine continues. This is similar to how `transition_teleport` works — the action's `done` flag stays false until combat resolves.

#### 5. CombatScene updates for trainer battles

- **Intro message**: "Trainer {name} wants to battle!" instead of "A wild {monster} appeared!"
- **Disable RUN menu option** when `isWild = false`
- **Disable ITEM → capture devices** when `isWild = false`
- **Enemy swap animation**: when enemy monster faints and trainer has more, show swap-in message
- **Victory message**: "You defeated {trainer}!" instead of just the XP rewards

#### 6. Import Paper Town map

Export `spyder_paper_town.tmx` from the Tuxemon repo, following the same process as other maps. Paper Town is the first outdoor town — it connects to the Paper Scoop (interior) and early routes.

Register the map and its events. The Paper Town events include:
- NPC dialog (post-intro Dante, shopkeeper interactions)
- The exit to Paper Scoop (`Go Outside` event in paper_scoop.yaml goes to Paper Town)
- Connections to routes

#### 7. Wire up first trainer battle

Identify the first trainer the player encounters after leaving Paper Town (likely on a route). Set up:
- NPC with sprite and party data
- Event trigger (walk into their line of sight, or interact)
- Pre-battle dialog
- `start_battle` action
- Post-battle branching dialog using `battle_outcome` condition

### Tasks

1. **NPC party registry** — `data/npcParties.ts` mapping NPC slug → monster list
2. **CombatMachine multi-monster** — enemy party support, auto-swap on enemy faint
3. **Trainer battle restrictions** — disable flee and capture when `isWild = false`
4. **Enemy AI** — random technique selection for trainer monsters
5. **`start_battle` action** — launch combat scene, wait for result, store outcome
6. **CombatScene trainer UI** — trainer intro, disable RUN, enemy swap messages
7. **Export Paper Town map** — TMX → JSON, tilesets, register in `maps.ts`
8. **Import Paper Town events** — NPC dialogs, map connections
9. **First trainer battle** — NPC data, event script, pre/post-battle dialog
10. **Tests** — trainer battle flow, flee/capture disabled, multi-monster, outcome tracking
11. **QA with puppeteer** — visual verification of trainer battle flow

## QA Validation

Use `/puppeteer` to verify this story in a real browser. Write a QA script that:

1. Launches the game, gives the player a party via `A.addMonster()`
2. Teleports to Paper Town, screenshots the town layout
3. Triggers a trainer battle (via event or debug command)
4. Verifies the intro message says "Trainer X wants to battle!" (not "wild")
5. Verifies the RUN option is disabled/greyed out
6. Fights through the battle — defeats enemy monsters, verifies enemy swap-in when one faints
7. On victory, verifies "You defeated X!" message
8. Verifies `battle_outcome` is stored — check via `getState()` that the NPC slug maps to "won"
9. Verifies post-battle dialog shows the "win" branch text

## Acceptance Criteria

- [ ] NPC trainers can have multi-monster parties defined in a registry
- [ ] `start_battle` action launches CombatScene with trainer's party
- [ ] Trainer battles disable fleeing with appropriate message
- [ ] Trainer battles disable capture devices with appropriate message
- [ ] Enemy AI sends out next monster when active one faints
- [ ] Combat ends when all enemy monsters are defeated (win) or all player monsters faint (lose)
- [ ] Battle outcome stored in session, queryable via `battle_outcome` condition
- [ ] CombatScene shows trainer-specific intro and victory messages
- [ ] Paper Town map loads and renders correctly
- [ ] At least one trainer battle is wired up and playable end-to-end
- [ ] Post-battle event branching works (different dialog on win vs loss)
- [ ] All code passes `npm run format:check && npm run lint && npx tsc --noEmit && npm test`
- [ ] QA validation passes via `/puppeteer`
