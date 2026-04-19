# Todo: Shared YAML Loading and Variable Math

## What

Implement `load_yaml`, `copy_variable`, and `variable_math` actions. These are foundational -- `load_yaml` is used by nearly every building interior to load shared event templates (cathedral healing, shop flows), and `variable_math`/`copy_variable` are used for score tracking and progression logic.

## Why

Upstream, every healing center and scoop shop calls `load_yaml spyder_cathedral` to inject shared events (nurse healing, billing, PC access). Without this, we'd need to duplicate event definitions across dozens of maps. `variable_math` is used in the leather gym for score tracking (`variable_math player,gym_points,+,1`).

## Upstream Reference

**`load_yaml`** -- Fetches and merges another YAML event file into the current map's events:
```yaml
# From spyder_healing_center.yaml
LoadCathedral:
  type: event
  actions:
    - load_yaml spyder_cathedral
```
The loaded YAML's events get merged into the current map as if they were defined inline. Look at `mods/tuxemon/maps/spyder_cathedral.yaml` for the shared template. It defines events like `CathedralHealing`, `CathedralPC`, `CathedralSellMonster`.

**`copy_variable`** -- Copies one game variable to another:
```yaml
- copy_variable player,source_var,dest_var
```

**`variable_math`** -- Performs arithmetic on game variables:
```yaml
- variable_math player,gym_points,+,1    # increment
- variable_math player,bill_amount,*,2   # multiply
```

## Implementation

1. **`load_yaml` action** (`src/game/event/actions/loadYaml.ts`):
   - Parse the argument as a YAML filename (e.g., `spyder_cathedral`)
   - Fetch `assets/events/{filename}.yaml` (same location as map events)
   - Parse the YAML and merge its events into the current map's active event list
   - Skip if already loaded (prevent infinite loops / duplicate events)
   - This needs access to the event engine's event registry -- may need to pass the engine reference

2. **`copy_variable` action** (`src/game/event/actions/copyVariable.ts`):
   - Parse: `player,source_key,dest_key`
   - Copy `session.variables[source_key]` to `session.variables[dest_key]`

3. **`variable_math` action** (`src/game/event/actions/variableMath.ts`):
   - Parse: `player,variable_name,operator,operand`
   - Operators: `+`, `-`, `*`, `/`
   - Read current value as number, apply operator with operand, store back
   - If variable doesn't exist, treat as 0

## Verify with Puppeteer

Use `/puppeteer` to:
1. Create a test YAML file with a few events, then create a map YAML that uses `load_yaml` to include it. Teleport to that map and verify the loaded events fire correctly.
2. Test `variable_math`: use debug API to `setVariable("score", "5")`, then trigger an event with `variable_math player,score,+,3`. Verify via `getState()` that score is now `8`.
3. Test `copy_variable`: set a variable, copy it, verify both exist.

Alternatively, test by temporarily adding these actions to an existing map's event YAML and walking through.

## Done When

- `load_yaml` fetches and merges external YAML events into current map
- `copy_variable` copies game variables
- `variable_math` performs +, -, *, / on numeric game variables
- Upstream `spyder_cathedral.yaml` can be loaded into healing center maps
