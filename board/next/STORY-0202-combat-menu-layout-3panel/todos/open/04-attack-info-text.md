# Todo: Attack info card — text content

## What

When the player is in technique-selection mode, populate the bottom-left panel with the currently-highlighted technique's details as text. Four lines of information:

- `Accuracy XX%`
- `Power X` (hidden when no damage effect)
- `Cost X DP`
- `MELEE` or `RANGED` (just the word, all-caps — the badge artwork comes in STORY-0203)

This matches the layout of upstream's info card in `../../upstream-combat-ui.png`.

## Why

Today the bottom-left panel just shows "Choose a technique:" — it conveys nothing about which move you're about to use. Upstream's version makes technique selection an informed choice by showing the move's stats.

## Implementation

In `src/game/scenes/CombatScene.ts`:

- Replace the single `messageText` usage during technique selection with a small set of structured `Phaser.GameObjects.Text` labels stored on the scene — e.g. `infoCardName`, `infoCardAccuracy`, `infoCardPower`, `infoCardCost`, `infoCardRange`
- Lay them out inside the bottom-left panel, vertically stacked, with the technique name as a bigger top line and the four details below in a 2-line grid (similar to the screenshot — Accuracy / Range on one line, Power / Cost on the next, or just stacked vertically — pick whichever fits in the panel and is readable at 320×240)
- A new helper `renderInfoCard(tech: TechniqueDef | null)` should:
  - When `tech == null`, hide all info labels and restore the regular `messageText` prompt
  - When given a tech, populate each label and show them; hide the regular `messageText`
- The `Power X` line is derived from the first `{ kind: "damage", power }` entry in `tech.effects`. If none, hide the Power label entirely
- Accuracy is `Math.round(tech.accuracy * 100)` followed by `%`
- Cost is `tech.dpCost` followed by ` DP`
- Range label is `tech.range.toUpperCase()` (`MELEE` or `RANGED`)

Don't reuse `messageText` for these — they need to coexist with status/error messages (e.g. "Not enough Dark Power!") which still belong in `messageText`.

## Verification

- Enter battle, hit FIGHT, info card shows the first technique's details
- For Rockitten or another monster with non-damage moves, verify Power is hidden on those (e.g. Growl, Harden) and visible on damage moves
- "Not enough DP" messages still appear via `messageText` when applicable
