# Todo: Render range badge on the attack info card

## What

Replace the plain-text "MELEE" / "RANGED" label (added in STORY-0202) with the upstream range icon — the colored pill badge visible in `../../upstream-combat-ui.png` next to "Power 15".

## Why

The range badge is one of the most visually prominent elements in the screenshot — it's a colored pill with stylized borders, not just text. Replacing the plain text with the upstream artwork makes the info card legible at a glance.

## Implementation

In `src/game/scenes/CombatScene.ts`:

- Hide / remove the `infoCardRange` plain-text label from STORY-0202 (or stop populating it)
- Add `infoCardRangeIcon: Phaser.GameObjects.Image | null`
- In `renderInfoCard(tech)`:
  - If `tech == null`, hide the icon
  - Else, `setTexture(RANGE_ICON_KEY(tech.range))` and show it, positioned near where "RANGED" was rendered in STORY-0202 (next to the Power line, matching the screenshot)
- The depth and panel-clipping rules are the same as the element icon

The upstream range icons already include the colored pill background and the word ("MELEE" / "RANGED") baked into the pixel art, so we don't need both a text label and an icon.

## Verification

- Highlight Ram (melee) → MELEE pill appears
- Highlight Rock Throw (ranged) → RANGED pill appears
- Highlight Growl (ranged, status move) → RANGED pill still appears (the badge reflects `range`, not damage class)
- Switch between melee and ranged moves quickly — pill swaps instantly
