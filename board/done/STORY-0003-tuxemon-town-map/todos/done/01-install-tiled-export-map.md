# Set up devenv.nix with Tiled and export a town map

Add a `devenv.nix` to the repo that includes the Tiled map editor (hopefully
available in nixpkgs, otherwise write a derivation). This gives us the Tiled
CLI for map export.

Pick a small Tuxemon town (e.g. Cotton Town or Timber Town) and export it:

    tiled --export-map --embed-tilesets cotton_town.tmx cotton_town.json

The `--embed-tilesets` flag inlines tileset data into the JSON so we don't
need separate .tsx/.tsj files. Copy the JSON + all referenced tileset PNGs
into `public/assets/maps/`.
