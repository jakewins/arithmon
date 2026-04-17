{ pkgs, ... }:

{
  packages = [
    pkgs.nodejs
    pkgs.tiled
    pkgs.chromium
  ];

  env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH = "${pkgs.chromium}/bin/chromium";
}
