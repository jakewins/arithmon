# Todo: Upstream YAML Integration Test

## What

Write an automated test that loads every upstream Spyder YAML event file and verifies no unknown actions or conditions are encountered.

## Why

This is the final validation that our engine can handle the full Tuxemon Spyder campaign. If any action or condition is missing, the test catches it immediately. This also serves as a regression test -- future changes won't accidentally remove support.

## Implementation

1. **Copy all upstream Spyder YAML files** into `public/assets/events/upstream/` (or a test fixtures directory):
   - Fetch from `https://raw.githubusercontent.com/Tuxemon/Tuxemon/development/mods/tuxemon/maps/spyder*.yaml`
   - Include: `spyder.yaml`, `spyder_cathedral.yaml`, `spyder_bedroom.yaml`, `spyder_paper_scoop.yaml`, `spyder_healing_center.yaml`, `spyder_candy_cafe.yaml`, `spyder_candy_center.yaml`, `spyder_candy_inn1.yaml`, `spyder_candy_inn2.yaml`, `spyder_candy_port.yaml`, `spyder_cotton_tunnel.yaml`, `spyder_diamond_hill.yaml`, `spyder_dojo1.yaml`, `spyder_flower_center.yaml`, `spyder_flower_house1.yaml`, `spyder_flower_house2.yaml`, `spyder_flower_petshop.yaml`, `spyder_flower_scoop.yaml`, `spyder_greenwash_level3.yaml`, `spyder_leather_center.yaml`, `spyder_leather_gym.yaml`, `spyder_leather_museum.yaml`, `spyder_nimrod_room.yaml`, `spyder_paper_daycare.yaml`, `spyder_paper_manor.yaml`, `spyder_paper_rival_bedroom.yaml`, `spyder_paper_rival_downstairs.yaml`, `spyder_paper_rival_office.yaml`, `spyder_timber_cafe.yaml`, `spyder_timber_center.yaml`

2. **Write a Vitest test** (`src/game/event/__tests__/upstream-compat.test.ts`):
   ```typescript
   // For each YAML file:
   //   1. Parse it
   //   2. Extract all action names and condition names
   //   3. Verify each action name exists in our action registry
   //   4. Verify each condition name exists in our condition registry
   //   5. Report any unknowns
   ```

3. **Test should enumerate**:
   - All unique action types across all files
   - All unique condition types across all files
   - Assert both sets are subsets of our registered actions/conditions

4. **Optional: runtime smoke test** via Puppeteer:
   - Load each YAML file into the event engine
   - Verify no runtime errors during parsing
   - Don't need to execute events, just verify they parse and register

## Verify with Puppeteer

Use `/puppeteer` to:
1. For a sampling of upstream YAML files (bedroom, paper_scoop, healing_center, leather_gym, dojo1):
   - Load the map
   - Verify events register without console errors
   - Walk to a couple event tiles, verify they trigger
2. This is a smoke test -- deep testing of each map's content happens in STORY-0050

## Done When

- All upstream Spyder YAML files are present in the test fixture directory
- Vitest test passes: all action and condition types are recognized
- No "unknown action" or "unknown condition" warnings when loading any upstream YAML
- Test runs as part of `npm test`
