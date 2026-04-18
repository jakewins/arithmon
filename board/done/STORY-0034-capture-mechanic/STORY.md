# STORY-0034: Capture mechanic

## Description

Implement the ability to capture wild monsters using capture device items (tuxeballs). When the player uses a capture device in combat, a shake-check determines success or failure. On success, the wild monster is added to the player's party (or storage if party is full).

**Key goal**: align our capture formula and flow with Tuxemon's Gen III-IV inspired shake check.

### Tuxemon reference

- **Capture formula**: `tuxemon/formula.py` `shake_check()` and `capture()`:
  - `shake_check(target, status_modifier, tuxeball_modifier)` = `(3*maxHP - 2*currentHP) * catch_rate * status_mod * ball_mod / (3*maxHP)`
  - `capture(shake_check)`: loops `total_shakes` (4) times. Each iteration: random(0, shake_divisor) — if > shake_check, escape at that shake count. All pass = captured.
  - Monsters at lower HP are much easier to catch. Status conditions (sleep, paralyze) increase the modifier.
- **Monster catch_rate**: Defined per species in monster YAML (e.g. `catch_rate: 125`). Higher = easier to catch.
- **Capture device items**: `mods/tuxemon/db/item/tuxeball.yaml` — category: capture, effect type: capture with a modifier parameter. Different balls have different modifiers.
- **Capture animation**: `tuxemon/states/combat_animations.py` `animate_capture_monster()`:
  - Throw item sprite toward the monster
  - Monster hides on hit (sucked into ball)
  - Ball lands, shakes N times (bounce up-down)
  - Success: ball settles, "Gotcha!" message, monster removed from field
  - Failure: ball breaks open, monster reappears with blink animation
- **Post-capture**: Monster added to party if space, otherwise goes to PC storage. Player asked to nickname it.
- **Party/storage**: `PARTY_LIMIT = 6`. If party is full, monster goes to `tuxemon/npc.py` `monster_boxes` (PC storage).

### What to build

#### 1. Capture formula

Add to `combat/formula.ts`:
- `shakeCheck(target: Monster, ballModifier: number): number` — simplified version of Tuxemon's formula
- `attemptCapture(shakeCheck: number, totalShakes?: number): { success: boolean, shakes: number }` — returns how many shakes before escape (or all shakes = success)

Add `catchRate` to `MonsterDef` — each species has a base catch rate (e.g. 125 for common, 45 for rare).

#### 2. Capture action in CombatMachine

Add `{ type: "capture", itemSlug: string }` to `PlayerAction`. When processed:
- Run the capture formula
- Emit shake events for animation: "The tuxeball shakes..." (once per shake)
- On success: "Gotcha! {Monster} was caught!"
- On failure after N shakes: "{Monster} broke free!"
- Capture costs the player's turn — if capture fails, the enemy attacks

#### 3. Post-capture handling

On successful capture:
- Add the captured monster to `session.player.monsters` (if party has space)
- If party is full, store in a secondary storage (simple array on session for now — PC storage can be fleshed out later)
- Remove the monster from combat — combat ends (win)
- Consume one capture device from inventory

#### 4. Wire capture devices in item menu

When the player selects a capture device from the item menu (STORY-0033), auto-target the enemy and trigger the capture action. Don't show the party list — capture devices always target the opponent.

Only allow capture devices in wild battles (not trainer battles, when those exist).

#### 5. Simple capture animation

At minimum:
- Show shake count in messages ("Shake... Shake... Shake...")
- On success: different message + combat ends
- On failure: combat continues with the enemy's turn

Full visual animation (ball sprite, bounce, etc.) can come in a later visual polish story.

### Tasks

1. **Add catchRate to MonsterDef** — define per species
2. **Capture formula** — `shakeCheck()` and `attemptCapture()` in `combat/formula.ts`
3. **Capture action** — extend `PlayerAction` and `CombatMachine` for capture flow
4. **Post-capture** — add monster to party/storage, consume item, end combat on success
5. **Wire to item menu** — capture devices auto-target enemy, trigger capture action
6. **Tests** — capture formula edge cases (1 HP = easy catch, full HP = hard), party-full storage

## QA Validation

Use `/puppeteer` to verify this story in a real browser. Capture success depends on the enemy's HP, so you need control over it. Add a debug command `A.setEnemyHp(hp)` to set the wild monster's current HP during combat.

Write a QA script that:

1. Launches the game, starts combat
2. Sets the enemy's HP to 1 via `A.setEnemyHp(1)` to maximize capture chance
3. Uses a tuxeball from the item menu
4. Watches for shake events via `getEvents()` — verify shake messages appear
5. On success: verify the monster was added to the party via `getState()`, item consumed, combat ended
6. Tests failure path: set enemy HP to max, attempt capture, verify "broke free" message and combat continues
7. Tests party-full scenario: fill the party to 6 monsters via `A.addMonster()`, capture another, verify it goes to storage

## Acceptance Criteria

- [ ] Using a tuxeball on a wild monster triggers the capture formula
- [ ] Lower HP makes capture more likely
- [ ] Shake count is shown in combat messages (1-4 shakes)
- [ ] On success: monster added to party, item consumed, combat ends as a win
- [ ] On failure: monster remains, item consumed, enemy gets a turn
- [ ] If party is full, captured monster goes to storage
- [ ] Capture devices are only usable in wild battles
- [ ] Each monster species has a `catchRate` defining capture difficulty
- [ ] All code passes formatter, linter, typecheck, and tests
