# STORY-0004: mvp-combat

## Description

Implement a minimal combat system: one monster, one attack, fight-or-flee.
Walking on grass tiles in the overworld triggers a random encounter (50%
probability for easy testing). The game transitions to a combat scene with
front/back monster sprites, HP bars, a message box, and a Fight/Run menu.
Combat is a simple turn loop: player attacks, enemy attacks, check HP, repeat.

This is the foundation for the Arithmon math-spell mechanic — the "solve a
math problem to power your attack" would slot in where the player picks Fight.

## Code structure

```
src/game/
  scenes/
    OverworldScene.ts       — existing, add encounter trigger on grass tiles
    CombatScene.ts          — combat UI + rendering
  combat/
    machine.ts              — turn state machine (decision → action → resolve)
    formula.ts              — damage calc, flee chance (pure functions, testable)
  data/
    monsters.ts             — monster definitions (static data)
    techniques.ts           — technique definitions (static data)
  model/
    Monster.ts              — Monster instance (computed stats, current HP)
```

## Key decisions

- **Encounter detection**: check ground layer tile ID on each player step.
  Tile 1552 is the dominant grass tile in Cotton Town. Use ~50% encounter rate
  for easy testing (tune down later).
- **Stats formula**: `base_stat * (level + 7)` — simplified from Tuxemon, no
  IVs/TPs/shapes for now.
- **Damage formula**: `(7 + attacker.level) * attacker.attack * technique.power
  / defender.defense` — matches Tuxemon's approach.
- **No capture, items, swapping, type effectiveness, status effects** — just
  fight or flee.
- **Enemy AI**: always uses its one technique.

## Monster for MVP

Use Tuxemon's Rockitten (or similar) — grab the battle spritesheet from
`gfx/sprites/battle/rockitten-sheet.png` (64x64 front + back sprites).

## Acceptance Criteria

- [ ] Walking on grass tiles has a ~50% chance to trigger an encounter
- [ ] Game transitions from overworld to combat scene
- [ ] Combat scene shows: enemy front sprite, player back sprite, HP bars,
      message box, Fight/Run menu
- [ ] Selecting Fight deals damage based on the formula
- [ ] Enemy attacks back each turn
- [ ] Combat ends when either monster faints (HP ≤ 0) or player flees
- [ ] Game returns to the overworld after combat ends
- [ ] `formula.ts` has unit tests for damage calc and flee chance
