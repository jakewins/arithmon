# STORY-0054: fix-combat-player-card-layout

## Description

The player's monster info card in the combat scene has visual alignment problems. See the reference screenshot at `~/Pictures/Screenshots/20260420_095714.png`.

### Issues visible

- The name/level text ("Budaye Lv5") has a shadow or dark background that looks misaligned or wrongly sized
- The white panel behind the HP bar doesn't align cleanly with the dark card frame
- The overall card background/shadow rendering looks off — edges don't line up
- Text labels (XP, DP) and their associated bars/indicators may have positioning issues

### Approach

Look at the CombatScene code to find where the player's info card is built (name, level, HP bar, XP bar, DP pips, monster ball icons). Examine how the background panel, shadow, and text elements are positioned. Use puppeteer to spawn a battle, screenshot, compare against a clean look, and iterate on positioning until it looks right.

## Acceptance Criteria

- [ ] Player card text, bars, and background panel are properly aligned
- [ ] Shadow/outline on the card looks clean (no visible misalignment)
- [ ] Verified via puppeteer screenshot of a combat scene
