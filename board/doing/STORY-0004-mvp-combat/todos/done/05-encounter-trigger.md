# Add encounter triggering on grass tiles

Update `OverworldScene` to detect when the player steps on a grass tile:

- Check the ground layer tile at the player's current tile position each
  time the player moves (not every frame — only on tile transitions).
- Grass tile IDs: at minimum tile 1552 (dominant grass in Cotton Town).
- Roll encounter with ~50% probability for easy testing.
- On encounter: spawn a Rockitten at a level near the player's, pause the
  overworld, and launch `CombatScene`.
- On combat end: resume the overworld. If the player won, just continue
  (no XP/rewards yet). If they lost or fled, same — just resume.

The high encounter rate is intentional for testing and will be tuned down
in a later story.
