# Implement the combat turn state machine

Create `combat/machine.ts` — a pure logic state machine (no Phaser dependency)
that drives the turn loop:

States: INTRO → DECISION → ACTION → RESOLVE → (loop or END)

- **INTRO**: sets up initial message ("A wild Rockitten appeared!")
- **DECISION**: waits for player input (Fight or Run)
- **ACTION**: resolves player action, then enemy action. Applies damage via
  formula. Produces a list of combat events/messages for the UI to display.
- **RESOLVE**: checks if either monster fainted. If so → END. Otherwise →
  DECISION for next turn.
- **END**: returns outcome (win/lose/fled).

The machine should emit events (damage dealt, monster fainted, fled, miss)
that the CombatScene can consume for display. This keeps rendering separate
from logic.

Write unit tests for a full combat sequence (player attacks until enemy faints).
