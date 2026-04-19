# Todo: Add Party Tray Icons

## What

Show a row of tuxeball icons indicating how many party members each side has remaining, matching upstream Tuxemon's party tray display.

## Why

Upstream Tuxemon shows a row of small ball icons below each combatant's HUD panel -- filled balls for alive monsters, empty for fainted, hollow for empty slots. This gives the player information about both sides' remaining strength.

## Reference

- Party tray images: `Tuxemon/mods/tuxemon/gfx/ui/combat/opponent_party_tray.png`, `player_party_tray.png`
- Icon images: `Tuxemon/mods/tuxemon/gfx/ui/icons/party/party_icon01.png` (alive), `party_icon03.png` (fainted), `party_empty.png` (empty)
- The tray is the background strip, icons are placed on top

## Implementation

1. **Copy party icon assets from upstream**:
   - `party_icon01.png` (alive), `party_icon03.png` (fainted), `party_empty.png` (empty slot)
   - Destination: `public/assets/ui/combat/`
   - Optionally copy the tray background images too, or just position icons without a tray background

2. **Load icon images in preload()**

3. **Render party tray in create() and update on state changes**:
   - Player tray: show icons for each party slot (up to PARTY_LIMIT=6)
     - Alive monster = filled icon
     - Fainted monster (hp <= 0) = fainted icon
     - Empty slot = empty icon
   - Enemy tray: show icons for enemy party (if trainer battle with known party size)
     - For wild battles, show a single filled icon
   - Position near respective HUD panels

4. **Update icons when monsters faint** during battle:
   - Listen for relevant combat events (monster fainted) and update the icon states
   - The `machine.party` and `machine.enemyParty` arrays track party status

## Verification

- Player's party tray shows correct number of alive/fainted/empty icons
- For trainer battles, enemy tray reflects their party status
- Icons update when monsters faint during battle
