# Todo: Simplify .gitignore to fully track mods/tuxemon/gfx/tilesets/

The current implementation uses a 6-line gitignore carve-out to track only
`*.tsx` files under `mods/tuxemon/gfx/tilesets/`. That's more complex than
necessary and will require *another* gitignore exception the moment we need to
track any other file type (e.g. a `.json` sidecar, a `README`, etc.).

The directory contains only tileset metadata — no large binaries. The PNG
spritesheets live in `public/assets/maps/` and do not belong in
`mods/tuxemon/gfx/tilesets/`. The directory should simply be fully tracked.

## Steps

1. In `.gitignore`, replace the 6-line block:

   ```
   mods/*
   !mods/tuxemon
   mods/tuxemon/*
   !mods/tuxemon/gfx
   mods/tuxemon/gfx/*
   !mods/tuxemon/gfx/tilesets
   # Only the .tsx files are tracked — they're the collision-metadata source for
   # scripts/generate-blocked-tiles.py. PNGs live in public/assets/maps/.
   mods/tuxemon/gfx/tilesets/*
   !mods/tuxemon/gfx/tilesets/*.tsx
   ```

   with just:

   ```
   mods/*
   !mods/tuxemon
   mods/tuxemon/*
   !mods/tuxemon/gfx
   mods/tuxemon/gfx/*
   !mods/tuxemon/gfx/tilesets
   ```

   This unignores the entire `mods/tuxemon/gfx/tilesets/` directory rather
   than only its `.tsx` files.

2. Verify no stray non-tsx files are now tracked that shouldn't be:
   ```
   git status mods/tuxemon/gfx/tilesets/
   ```
   The directory currently contains only `.tsx` files, so `git status` should
   show the same set that was tracked before.

3. Run `npm run format:check && npm run lint && npx tsc --noEmit && npm test`
   to confirm no regressions.

4. Commit with an updated message describing the simplified gitignore.
