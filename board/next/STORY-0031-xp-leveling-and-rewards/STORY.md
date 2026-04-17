# STORY-0031: XP, leveling, and post-battle rewards

## Description

Add experience points and leveling so that winning battles is rewarding. After defeating a monster, the player's active monster gains XP. When enough XP accumulates, the monster levels up — stats increase and it may learn new techniques. The combat HUD gains an XP bar for the player's monster.

**Key goal**: align our XP and leveling system with Tuxemon's formulas and data model so monster growth feels right.

### Tuxemon reference

- **Experience model**: `tuxemon/monster/experience.py` — `MonsterExperience` tracks `total_experience` and calculates `level` from an XP curve. Tuxemon supports multiple growth rates (erratic, fast, medium_fast, medium_slow, slow, fluctuating) defined per monster species.
- **XP reward formula**: `tuxemon/formula.py` `award_experience()` — calculates XP gained from defeating a monster based on the defeated monster's level, base XP yield, and modifiers.
- **Reward system**: `tuxemon/combat/reward_system.py` — `RewardSystem` with `ExperienceCalculator` and `MoneyCalculator`. XP is awarded to all non-fainted party members who participated.
- **Stat recalculation**: `tuxemon/monster/stats.py` — `StatCalculator` recalculates all stats when level changes. Uses base stats + level + IVs.
- **Level-up moves**: Defined in monster data's `moveset` array — each move has a `level_learned` field. On level-up, check if any new moves should be learned.
- **Level-up screen**: `tuxemon/states/level_up.py` — `LevelUpSummaryState` shows the stat changes (old → new) after leveling up.
- **XP bar**: `tuxemon/menu/interface.py` — `ExpBar(Bar)` with blue foreground. Shown only on the player's HUD. Animated with `animate_exp()` in `combat_animations.py`.
- **Move learning limit**: Tuxemon limits monsters to 4 moves. If a new move is learned and slots are full, the player chooses which move to replace.

### What to build

#### 1. Add XP to Monster model

Extend `Monster` with:
- `totalXp: number` — cumulative XP
- `xpToNextLevel: number` — XP needed to reach next level (derived from growth curve)
- `xpProgress: number` — fraction of current level completed (0.0 to 1.0, for the XP bar)

Use a simple growth curve for now (e.g. `xpForLevel(n) = n^3` or Tuxemon's medium-fast table).

#### 2. XP reward after combat

When a wild monster is defeated:
- Calculate XP reward based on the defeated monster's level and base XP yield
- Award XP to the active monster (later stories can award to all participants)
- Show "Gained X XP!" message in combat

#### 3. Level-up

When XP crosses the threshold:
- Increment level
- Recalculate stats (maxHp, attack, defense, speed) using the existing stat formula
- Heal the HP increase (current HP goes up by the difference in maxHp)
- Show "Level up! Now Lv X!" message
- Check for new moves in the moveset

#### 4. New move learning

When a monster levels up and a new technique is at the learned level:
- If the monster has fewer than 4 techniques, add it automatically
- If the monster already has 4, show a prompt to choose which move to replace (or skip)
- Show "{Monster} learned {Move}!" message

#### 5. XP bar on combat HUD

Add an XP bar below the player's HP bar in the combat HUD:
- Blue fill on dark background
- Shows progress toward next level (0% to 100%)
- Animates smoothly when XP is gained
- Only shown for the player's monster (not the enemy)

#### 6. Level-up summary (optional in this story)

After combat, if the monster leveled up, show a brief summary of stat changes. Can be a simple dialog-style overlay. This can be deferred to a later polish story if needed.

### Tasks

1. **Extend Monster model** — add `totalXp`, XP curve calculation, `xpProgress` getter
2. **XP reward formula** — calculate XP from defeated monster's level/base yield
3. **Award XP after combat** — emit XP gain events, integrate into combat end flow
4. **Level-up logic** — detect level threshold, recalculate stats, heal HP difference
5. **Move learning** — auto-learn new moves on level-up, 4-move limit with replace prompt
6. **XP bar rendering** — blue bar below player HP bar in combat HUD, animated
7. **Tests** — XP calculation, level-up stat recalculation, move learning at correct levels

## QA Validation

Use `/puppeteer` to verify this story in a real browser. Testing leveling naturally requires winning many fights, so add debug commands to shortcut:

- `A.setMonsterXp(index, xp)` — set a monster's XP to a specific value (to position it just below a level-up threshold)
- `A.startCombat()` — force a wild encounter

Write a QA script that:

1. Launches the game, screenshots the combat HUD to verify the XP bar is visible below the HP bar
2. Sets the lead monster's XP to just below the next level threshold
3. Starts and wins a combat encounter
4. Screenshots the XP bar animation and level-up message
5. Checks `getState()` to verify the monster's level increased and stats were recalculated
6. Tests move learning: set XP so the monster levels to a level where it learns a new move, verify the move appears in the monster's technique list

## Acceptance Criteria

- [ ] Defeating a wild monster awards XP to the player's active monster
- [ ] XP gain is shown as a combat message ("Gained X XP!")
- [ ] When enough XP is accumulated, the monster levels up with recalculated stats
- [ ] New techniques are learned at the appropriate levels
- [ ] If the monster already knows 4 moves, a prompt asks which to replace
- [ ] An XP bar is displayed below the player's HP bar in combat, showing level progress
- [ ] XP bar animates when XP is gained
- [ ] XP and level persist on the Monster instance across battles
- [ ] All code passes formatter, linter, typecheck, and tests
