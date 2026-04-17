# STORY-0015: Run the Real Tuxemon start_tuxemon.yaml Script

## Description

Replace our hand-written `sample_cutscene.yaml` with the real `start_tuxemon.yaml` character-creation cutscene from upstream Tuxemon. This script lets the player choose a campaign (spyder/xero/water), gender, and appearance, then teleports to the corresponding starting map.

### Upstream References

All assets come from the Tuxemon repo on the `development` branch:

- **Repo:** `https://github.com/Tuxemon/Tuxemon` (branch: `development`)
- **Raw file base URL:** `https://raw.githubusercontent.com/Tuxemon/Tuxemon/development/`
- **Start script:** `mods/tuxemon/maps/start_tuxemon.yaml`
- **Map TMX files:** `mods/tuxemon/maps/<map_name>.tmx` (export with `tiled --export-map --embed-tilesets`)
- **Tileset PNGs:** `mods/tuxemon/gfx/tilesets/` (e.g. `core_indoor_floors.png`)
- **Player sprites:** `mods/tuxemon/gfx/sprites/player/` (16×32, 3 cols × 4 rows)
- **Background images:** `mods/tuxemon/gfx/ui/background/` (for `change_bg` image overlay)

For map export, use `devenv shell` to get `tiled` CLI, then decompress zlib base64 layer data to plain int arrays (see STORY-0014's export process as reference). Tileset image paths in exported JSON need stripping to bare filenames.

### Gap Analysis

Every action and condition in `start_tuxemon.yaml` is already supported by our engine:

| Used in script | Our implementation |
|---|---|
| `change_bg` | `changeBg.ts` |
| `translated_dialog_choice` | `translatedDialogChoice.ts` |
| `set_char_attribute` | `setCharAttribute.ts` |
| `set_template` | `setTemplate.ts` |
| `transition_teleport` | `transitionTeleport.ts` |
| `variable_set` condition | `variableSet.ts` |

**One extension needed:** `change_bg gradient_blue,choice_gender,image` — the 3-arg form that overlays an image (e.g. a character silhouette) on top of the background colour during the gender-choice step. Our current `change_bg` only handles the single-colour arg. We'll extend it to support the `color,image_key,image` form: set the background colour and display a centered sprite on top. The image assets live in Tuxemon's `mods/tuxemon/gfx/ui/background/` directory.

### What to build

1. **Fetch and register `start_tuxemon.yaml`**
   - Copy from upstream Tuxemon repo (`mods/tuxemon/maps/start_tuxemon.yaml`).
   - Preload it in OverworldScene (or a dedicated StartCutsceneScene) as a text asset.
   - Wire up the V-key debug shortcut (or game start flow) to launch this instead of `sample_cutscene.yaml`.

2. **Register destination maps** (only `player_house_bedroom` is already done)
   - `spyder_bedroom.tmx` → export JSON, add tilesets, register in `maps.ts`. This is the Spyder campaign starting bedroom.
   - `water_end_of_desert.tmx` → same process. This is the Water campaign desert start.
   - Each map needs: Tiled JSON export (decompress layers), tileset PNGs, registry entry.

3. **Player sprite variants**
   - The script uses `set_template` with sprites like `brownheroine_brown`, `adventurerblack`, `enbyasian`, `penguin`, `heroine`, `adventurer`.
   - `adventurer` is already our default player sprite.
   - Remaining sprites need to be fetched from Tuxemon's `mods/tuxemon/gfx/sprites/player/` and registered as spritesheets.
   - `set_template` currently only stores the name on session — it doesn't swap the player sprite at runtime. We need to either:
     - (a) Swap the player's spritesheet in OverworldScene.create based on `session.player.template`, or
     - (b) Defer sprite swapping until the player lands on the destination map (since the cutscene has no visible player sprite anyway).
   - Option (b) is simpler — OverworldScene.create already runs on teleport and can read `session.player.template` to pick the spritesheet.

4. **Translated dialog labels**
   - `translated_dialog_choice` displays raw option keys like `spyder_campaign`, `gender_male`, `black_female`. Tuxemon has a translation layer (`l10n/`) mapping these to human-readable strings.
   - For now, we can either:
     - (a) Add a simple i18n lookup from a bundled English `.json`, or
     - (b) Title-case the keys as display labels (e.g. `spyder_campaign` → `Spyder Campaign`).
   - Option (b) is quick; (a) is the proper long-term path.

5. **Integration test**
   - Load `start_tuxemon.yaml`, drive it through the engine: pick spyder → male → white_male → verify `pendingTeleport` targets `spyder_bedroom` at (4,4).

## Acceptance Criteria

- [ ] `start_tuxemon.yaml` loaded and launched as the intro cutscene
- [ ] All three campaign paths (spyder/xero/water) reach `transition_teleport` with the correct destination
- [ ] Player sprite on the destination map reflects the chosen template
- [ ] `spyder_bedroom` and `water_end_of_desert` maps exported, registered, and renderable
- [ ] `change_bg` with image overlay displays the character silhouette centered on screen
- [ ] Choice labels are human-readable (at minimum title-cased)
- [ ] Integration test covers at least one full path through the script
- [ ] All existing tests still pass

## Proposed TODO Breakdown

1. Fetch `start_tuxemon.yaml` from upstream, add to `public/assets/events/`
2. Fetch + export `spyder_bedroom.tmx` and `water_end_of_desert.tmx` maps + tilesets
3. Register all three destination maps in `maps.ts`
4. Fetch player sprite variants from Tuxemon, register as spritesheets
5. Make OverworldScene.create use `session.player.template` for the player spritesheet
6. Make `translated_dialog_choice` title-case option labels for display
7. Extend `change_bg` to support `color,image_key,image` form — fetch image assets from Tuxemon's `gfx/ui/background/`, preload them, and display centered on screen (cleaning up the previous image on the next `change_bg` call)
8. Wire up `start_tuxemon.yaml` as the V-key cutscene (replacing `sample_cutscene`)
9. Write integration test for one full path
10. Manual browser test of all three campaign paths
