# Todo: Preload icon textures in CombatScene

## What

Register all the new element-small and range PNG textures in `CombatScene.preload()` so they're available when the info card is rendered.

## Why

`CombatScene` already preloads battle backgrounds, island sheets, HUD panels, and party icons — see lines ~212-264 in `src/game/scenes/CombatScene.ts`. The icon textures need the same treatment.

## Implementation

In `src/game/scenes/CombatScene.ts`:

- Add constants near the top for the asset paths (mirroring the existing `PARTY_ICON_ASSETS` map style):

  ```ts
  const ELEMENT_ICON_KEY = (slug: string) => `element-${slug}`;
  const RANGE_ICON_KEY = (range: string) => `range-${range}`;
  ```

- In `preload()`, import `ELEMENT_SLUGS` from `../data/elements` and loop over them:

  ```ts
  for (const slug of ELEMENT_SLUGS) {
    const key = ELEMENT_ICON_KEY(slug);
    if (!this.textures.exists(key)) {
      this.load.image(key, `assets/ui/combat/icons/element/${slug}_type_small.png`);
    }
  }
  for (const range of ["melee", "ranged"]) {
    const key = RANGE_ICON_KEY(range);
    if (!this.textures.exists(key)) {
      this.load.image(key, `assets/ui/combat/icons/range/${range}.png`);
    }
  }
  ```

- Match the existing `if (!this.textures.exists(...))` idiom so re-launches don't double-load

## Verification

- `npm run dev`, open the game, watch the network tab — all 13 element icons and 2 range icons load successfully (no 404s)
- Browser console: `game.scene.getScene("CombatScene").textures.exists("element-wood")` returns `true` in a battle context
