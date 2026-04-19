# Todo: Environment-Based Background Selection

## What

Select the battle background image based on the current map's environment, so forest maps get forest backgrounds, caves get cave backgrounds, etc.

## Why

Upstream Tuxemon sets the environment per-map via `set_environment` event actions. Each environment references a specific background image and island sheet. This makes battles feel connected to where they happen in the game world.

## Reference

- Upstream environment YAMLs: `Tuxemon/mods/tuxemon/db/environment/*.yaml`
- Each specifies `battle_graphics.background` and `battle_graphics.island_sheet`
- Environment is set by map events: `set_environment grass`, `set_environment cave`, etc.
- Our maps currently have no environment concept

## Implementation

1. **Define a minimal environment config** in our game data:
   - Map an environment slug to a background image and island sheet
   - Start with: `grass` (default/outdoor), `forest`, `cave`
   - Store as a simple lookup (e.g., a `Record<string, { background: string, island: string }>`)

2. **Set environment per-map**:
   - Add an `environment` property to our map metadata or event system
   - Store the current environment in session state so CombatScene can read it
   - Default to `grass` if no environment is set

3. **Use environment in CombatScene**:
   - Read the current environment from session state
   - Load and display the corresponding background and island sheet
   - Fall back to grass if the specified assets don't exist

4. **Copy additional background/island assets** as needed:
   - At minimum: grass (already copied in todo 02/03), forest, cave
   - Source from upstream `Tuxemon/mods/tuxemon/gfx/ui/combat/` and `gfx/ui/island_sheet/`

## Verification

- Battles on different maps should show different backgrounds
- Default outdoor maps show grass background
- Cave maps (if any) show cave background
