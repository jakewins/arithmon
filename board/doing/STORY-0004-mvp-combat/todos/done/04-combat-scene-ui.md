# Build the CombatScene UI

Create `scenes/CombatScene.ts` — the Phaser scene that renders combat:

- **Background**: solid color or simple gradient
- **Enemy sprite**: front sprite (64x64) positioned upper-right area
- **Player sprite**: back sprite (64x64) positioned lower-left area
- **HP bars**: simple colored rectangles above/below each sprite, showing
  currentHp / maxHp ratio
- **Message box**: text area spanning the bottom of the screen, displays
  combat events from the machine ("Rockitten attacks!", "You dealt 12 damage!")
- **Menu**: Fight / Run buttons, shown during DECISION phase, hidden otherwise

Grab a Tuxemon battle spritesheet (e.g. rockitten-sheet.png) for the
monster sprites. The player's monster can reuse the same sprite for now.

The scene receives combat data (player monster, enemy monster) and drives
the machine, rendering events as they occur.
