# Todo: Puppeteer QA — icons across elements & ranges

## What

Use the puppeteer harness to spawn battles with monsters that have a variety of element/range combinations, screenshot the info card for each, and confirm icons render correctly. Compare the final result against `../../upstream-combat-ui.png`.

## Why

Each technique in `src/game/data/techniques.ts` has an element/range pair; we need to confirm the asset paths and icon textures resolve for every one of them. Easy to miss a typo in `setTexture(...)` for one element.

## Implementation

Add a one-off script under `qa/local/` (gitignored, per `CLAUDE.md`). It should:

1. `launchGame()` + `setupGame()` (always, per `CLAUDE.md`)
2. For a small set of monsters covering different elements and ranges, spawn a battle (via the `spawnBattle` debug command if available)
3. Open FIGHT, cursor through every technique, screenshot the info card for each
4. Save screenshots next to the script
5. Print a summary of which (element, range) combos were covered

Then visually:

- Spot-check 4-5 screenshots — does the element icon match the technique's element? Does the range badge match `melee` / `ranged`?
- Diff the final composite against `../../upstream-combat-ui.png` — structural layout (from STORY-0202) plus icon artwork (this story) should both match

Console-check for missing textures: `game.scene.getScene("CombatScene").textures.list` should include all 13 `element-*` keys and both `range-*` keys.

## Verification

- Every technique we have renders without a missing-texture warning in the browser console
- Element icons visibly differ between elements (fire ≠ water ≠ wood)
- Range badges visibly differ between melee and ranged
- Final FIGHT-submenu screenshot matches `../../upstream-combat-ui.png` to the level of "a child could tell these are the same game's UI"
