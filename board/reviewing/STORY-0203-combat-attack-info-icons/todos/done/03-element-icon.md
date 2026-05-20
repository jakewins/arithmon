# Todo: Render element icon on the attack info card

## What

Add a small element-icon image to the info card produced by `renderInfoCard` (added in STORY-0202). The icon is positioned to roughly match the green leaf in `../../upstream-combat-ui.png` (right side of the info card, vertically near the recharge/cost line).

## Why

The info card currently shows the technique's element only implicitly (you can sometimes guess from the move's color or name). Upstream renders an actual icon, which makes the element instantly readable. This is the most visually-recognizable element of the screenshot's info card.

## Implementation

In `src/game/scenes/CombatScene.ts`:

- Add `infoCardElementIcon: Phaser.GameObjects.Image | null` on the scene, created lazily (or pre-create once and re-texture on each render)
- In `renderInfoCard(tech)`:
  - If `tech == null`, hide the icon
  - Else, `setTexture(ELEMENT_ICON_KEY(tech.element))` and show it, positioned within the bottom-left info card panel. The exact pixel position should be tuned to land in roughly the same spot as the green leaf in `../../upstream-combat-ui.png` — typically right edge of the panel, vertically aligned with the Cost/Recharge line
- The element icon's depth should match the info-card text labels (so it sits above the panel border but doesn't get clipped)
- If a dual-element scheme is added later, the function can be extended — for now `TechniqueDef.element` is single-valued, so one icon is sufficient

## Verification

- Enter a battle with a Fire-type move (e.g. Ember, Fireball), highlight it — fire icon appears on the info card
- Highlight a Normal-type move — normal icon appears (it's a grey/white star in upstream)
- Highlight an Earth-type move (Rock Throw) — earth icon appears
- Move the cursor between techniques quickly — icon swaps instantly with the text
