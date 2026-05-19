# Todo: Port element tables from upstream

## What

Create `src/game/data/elements.ts` containing all 13 elements and their `against → multiplier` interaction maps, ported from `upstream/mods/tuxemon/db/element/*.yaml`.

## Notes

- Read every yaml in `upstream/mods/tuxemon/db/element/`. Each defines a `types:` list of `{against, multiplier}` pairs.
- Shape suggestion: `type ElementSlug = "fire" | "water" | ...; export const ELEMENTS: Record<ElementSlug, { against: Record<ElementSlug, number> }>`.
- We don't need icons or translation hooks at this stage — slugs only.
- Sanity-check the table is symmetric where expected (e.g., fire-vs-water and water-vs-fire are mirror): it likely isn't fully symmetric, that's fine, but you should at least skim for typos.
