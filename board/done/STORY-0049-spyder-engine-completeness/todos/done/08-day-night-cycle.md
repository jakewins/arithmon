# Todo: Day/Night Cycle

## What

Implement `update_time`, `time_is`, and the day/night visual system that applies screen tinting and changes encounter tables based on time of day.

## Why

Upstream Tuxemon has a full day/night cycle. The `spyder.yaml` global events check time of day to apply night tinting (`set_layer 0:0:80:120`) when outdoors and swap encounter tables between day and night variants (different monster species appear at night). This adds atmosphere and replayability.

## Upstream Reference

**`update_time`** -- Update time-of-day variables based on real clock or game clock:
```yaml
# From spyder.yaml
TimeUpdate:
  type: event
  conditions:
    - not location_inside
  actions:
    - update_time
    - set_layer ...   # conditionally apply night tint
```

**`time_is`** condition -- Check time of day:
```yaml
- is time_is stage_of_day,equals,night
- is time_is stage_of_day,equals,day
- not time_is stage_of_day,equals,night
```

Upstream uses real system time mapped to stages: dawn (5-7), morning (7-10), day (10-17), dusk (17-19), night (19-5).

**Encounter tables** have day/night variants:
```yaml
# From db/encounter/spyder_route1.yaml
monsters:
  - monster: pairagrin
    encounter_rate: 3.5
    daytime: true       # only during day
    level_range: [2, 4]
  - monster: aardorn
    encounter_rate: 3.5
    daytime: false      # only at night
    level_range: [3, 5]
```

## Implementation

1. **Add time-of-day tracking** (`src/game/session.ts` or new `src/game/time.ts`):
   - Track `stageOfDay: "dawn" | "morning" | "day" | "dusk" | "night"`
   - Map real system hours to stages (or use a configurable game clock)
   - Store as a game variable too (`time_stage_of_day`) for event access

2. **`update_time` action** (`src/game/event/actions/updateTime.ts`):
   - Read current system time, compute stage of day
   - Update session time variables
   - This is typically called from global events loaded via `load_yaml spyder`

3. **`time_is` condition** (`src/game/event/conditions/timeIs.ts`):
   - Parse: `stage_of_day,equals,night` (or other stage)
   - Compare against current time stage

4. **Wire night tinting into global events**:
   - When `time_is night` and `not location_inside`, apply `set_layer 0:0:80:120`
   - When entering an interior, clear the overlay
   - This should work automatically once `load_yaml spyder` is functional (from todo 01) and `set_layer` is implemented (from todo 03)

5. **Update encounter system** to support day/night filtering:
   - Add optional `daytime: boolean` to encounter table entries
   - Filter encounters based on current time stage when rolling

## Verify with Puppeteer

Use `/puppeteer` to:
1. Manually set time to "night" (via debug API or by mocking system time)
2. Teleport to an outdoor map -- verify dark blue tint overlay appears
3. Enter an indoor building -- verify tint clears
4. Walk in grass at "night" -- verify night-specific monsters appear (if configured)
5. Set time to "day" -- verify tint clears on outdoor maps
6. Screenshot day vs night for visual comparison

You may need to add a `A.setTime(stage)` debug command for testing.

## Done When

- `update_time` computes current time stage from system clock
- `time_is` checks time of day (day, night, dawn, dusk, morning)
- Night tinting applies automatically outdoors via global events
- Indoor maps are exempt from night tinting
- Encounter tables can filter by day/night
- Debug API allows overriding time for testing
