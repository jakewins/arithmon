# STORY-0029: Party system and monster persistence

## Description

Add a proper party system so the player can have up to 6 monsters that persist between battles. Currently combat hardcodes `Monster.spawn("rockitten", 5)` — there's no party, no persistence, and HP resets every fight. This story makes the party real: monsters live in `session.player.monsters`, combat draws from the party, and HP/status carry over.

**Key goal**: align our party/monster model with Tuxemon's `Monster` class and party management so later stories (switching, items, capture) have a solid foundation.

### Tuxemon reference

- **Monster class**: `tuxemon/monster/monster.py` — rich model with stats, experience, status, held items, moves, evolution. Our `Monster` class is a simplified version of this.
- **Party limit**: `PARTY_LIMIT = 6` — defined as a constant, enforced when adding monsters.
- **Session/NPC state**: `tuxemon/session.py`, `tuxemon/npc.py` — the player's NPC object holds the party as `monsters: list[Monster]`. Party order matters (first non-fainted is the lead).
- **Monster spawning**: `tuxemon/monster/monster.py` `Monster.from_db()` — creates from database definition, rolls IVs, sets level, calculates stats.
- **Stat calculation**: `tuxemon/monster/stats.py` — `StatCalculator` uses base stats + level + IVs + training. We can keep our simpler formula for now.

### What to build

#### 1. Expand monster data

Add 3-4 more monsters to `data/monsters.ts`, pulling from Tuxemon's monster database (`mods/tuxemon/db/monster/`). Include front/back battle sprites for each. Good starter set: rockitten (already have), plus a few from the Tuxemon starting area (e.g. budaye, ignibus, nut, grintot). Each should have a distinct moveset.

#### 2. Party initialization

Update `session.ts` `createSession()` to give the player a starting party (e.g. a level 5 rockitten). The `session.player.monsters` array is already typed but never populated. Combat should read from this array instead of spawning fresh monsters.

#### 3. Lead monster selection

The lead monster for combat is the first non-fainted monster in the party. Add a helper like `getLeadMonster(party: Monster[]): Monster | null` that returns it.

#### 4. HP persistence

After combat ends, the monster's `currentHp` should persist — don't reset it. The player returns to the overworld with their monsters in whatever state they left combat. This means:
- Win: lead monster keeps its remaining HP
- Lose: lead monster is at 0 HP (fainted). If all party members are fainted, trigger whiteout/faint teleport.
- Flee: lead monster keeps its remaining HP

#### 5. Faint and whiteout

When all party monsters reach 0 HP, trigger a "whiteout" — heal all monsters to full and teleport the player to their faint teleport location (already have `session.faintTeleport`). Tuxemon does this in `tuxemon/event/actions/fade_out_and_teleport.py` triggered by the combat end handler.

#### 6. Wire combat to party

Update `OverworldScene` combat launch to pass `session.player.monsters[0]` (or lead monster) instead of spawning a fresh monster. Update `CombatScene` to write back HP changes to the party monster instance after combat.

#### 7. Monster instance identity

Monsters need stable identity so we can track the same instance across combat and party screens. Add a `readonly id: string` field (UUID or incrementing counter) to `Monster`.

### Tasks

1. **Add monster data** — 3-4 new MonsterDefs with movesets, add battle sprite assets
2. **Add monster ID** — unique identifier per Monster instance
3. **Populate starting party** — `createSession()` spawns a starter monster into the party
4. **Lead monster helper** — `getLeadMonster()` returns first non-fainted party member
5. **Wire combat to party** — OverworldScene passes party lead; CombatScene uses party monster instance (no clone)
6. **HP persistence** — monster HP carries over between battles
7. **Whiteout** — when all party fainted, heal all and teleport to faint location
8. **Tests** — lead monster selection, HP persistence after combat, whiteout trigger

## QA Validation

Use `/puppeteer` to verify this story in a real browser. Add these debug commands to the DebugBridge if they don't already exist:

- `A.startCombat()` — force a wild encounter (may exist from STORY-0028)
- `A.addMonster(slug, level)` — add a monster to the player's party

Write a QA script that:

1. Launches the game, checks `getState()` to verify the starter monster is in the party
2. Adds a second monster via `A.addMonster()`, verifies party has 2 members
3. Triggers combat, wins or flees, then checks `getState()` to verify HP persisted (not reset)
4. Tests whiteout: set all party monsters to 0 HP via a debug command (e.g. `A.setMonsterHp(index, hp)`), trigger combat, lose, verify the party was healed and player teleported to faint location

## Acceptance Criteria

- [ ] Player starts with a monster in their party (`session.player.monsters`)
- [ ] Combat uses the party's lead (first non-fainted) monster, not a fresh spawn
- [ ] Monster HP persists after combat — damage carries over to the next fight
- [ ] When all party monsters are fainted, whiteout triggers: heal all and teleport to faint location
- [ ] At least 3-4 monsters defined in the monster database with distinct movesets
- [ ] Each Monster instance has a unique ID
- [ ] All code passes formatter, linter, typecheck, and tests
