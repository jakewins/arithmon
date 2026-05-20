# Todo: Import icon assets from upstream

## What

Copy the element-small and range icon PNGs from upstream into our `public/assets/` tree so Phaser can load them.

## Why

All artwork already exists in `upstream/mods/tuxemon/gfx/ui/icons/`. We just need to move the subset we actually use into a stable path under `public/assets/`.

## Implementation

Create these destination paths (mirror upstream's structure under `combat/icons/`):

```
public/assets/ui/combat/icons/element/{slug}_type_small.png  # 13 files
public/assets/ui/combat/icons/range/melee.png
public/assets/ui/combat/icons/range/ranged.png
```

Use a shell command like:

```bash
mkdir -p public/assets/ui/combat/icons/element public/assets/ui/combat/icons/range
for slug in cosmic earth fire frost heroic lightning metal normal shadow sky venom water wood; do
  cp "upstream/mods/tuxemon/gfx/ui/icons/element/${slug}_type_small.png" \
     "public/assets/ui/combat/icons/element/${slug}_type_small.png"
done
cp upstream/mods/tuxemon/gfx/ui/icons/range/melee.png  public/assets/ui/combat/icons/range/melee.png
cp upstream/mods/tuxemon/gfx/ui/icons/range/ranged.png public/assets/ui/combat/icons/range/ranged.png
```

Verify with `ls public/assets/ui/combat/icons/element/ | wc -l` (should be 13).

Note: only the elements in our `ELEMENT_SLUGS` (13 entries) need to be copied. Upstream also has `aether` — we do not currently use it.

## Verification

- 13 element icons + 2 range icons exist at the destination paths
- All files are non-empty (`du -h public/assets/ui/combat/icons/**/*.png`)
- A quick spot-check open of a couple files (e.g. wood, fire) confirms they're 8-bit pixel art and visually distinct
