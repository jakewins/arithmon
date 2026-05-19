# Todo: Add element types to existing monsters and techniques

## What

- Add `types: ElementSlug[]` to every entry in `src/game/data/monsters.ts`. Look up each monster in `upstream/mods/tuxemon/db/monster/<slug>.yaml` and copy the `types:` list (1 or 2 entries).
- Add `element: ElementSlug` to every entry in `src/game/data/techniques.ts`. Look up each technique in `upstream/mods/tuxemon/db/technique/<slug>.yaml`.
- For techniques we invented (no upstream equivalent), pick the closest reasonable element and leave a one-line `// invented, mapped to <element>` comment.

## Done when

- TypeScript compiles
- No `unknown element` errors at module load
