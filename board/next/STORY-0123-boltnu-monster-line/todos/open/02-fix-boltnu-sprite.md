# Todo: Replace boltnu placeholder sprite with upstream asset

`public/assets/sprites/battle/boltnu-sheet.png` is a small placeholder
(298 bytes) — likely left over from earlier work. Upstream
`upstream/mods/tuxemon/gfx/sprites/battle/boltnu-sheet.png` is the
real 2580-byte sprite. Pixel data differs.

Copy upstream to public:

```sh
cp upstream/mods/tuxemon/gfx/sprites/battle/boltnu-sheet.png \
   public/assets/sprites/battle/boltnu-sheet.png
```

Everything else (boltnu entry, exclawvate entry including correct
catchRate=70 evolved-form, exclawvate sprite, both movesets, evolution
wiring at level 18) matches upstream.
