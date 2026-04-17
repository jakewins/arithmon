# STORY-0020: Stub Music and PC Actions

## Description

Stub out `play_music`, `music_playing`, and `access_pc` so that the full `spyder_bedroom.yaml` can be loaded without errors. These are non-critical features that would block event parsing if left unimplemented.

### Upstream events that need these

From `spyder_bedroom.yaml`:

```yaml
Play Music:
  actions:
  - play_music music_home
  conditions:
  - not music_playing music_home
  type: event

Use Computer:
  actions:
  - access_pc player
  conditions:
  - is char_facing_tile player
  - is button_pressed INTERACT
  - not variable_set kernelquest:yes
  type: event
  x: 3
  y: 1

Use Computer Kernel:
  actions:
  - translated_dialog spyder_pc_alert
  conditions:
  - is char_facing_tile player
  - is button_pressed INTERACT
  - is variable_set kernelquest:yes
  type: event
  x: 3
  y: 1
```

### Tasks

1. **Stub `play_music` action** — Log the music key to console, no-op. Register as action type `play_music`.

2. **Stub `music_playing` condition** — Always return false (so `not music_playing` is always true, allowing the Play Music event to fire each time — harmless since the action is a no-op). Register as condition type `music_playing`.

3. **Stub `access_pc` action** — Show a placeholder dialog (e.g. "The computer hums quietly..."). This replaces Tuxemon's full PC/storage UI which is a large feature we don't need yet.

4. **`Use Computer Kernel` event** — This uses `translated_dialog` (implemented in STORY-0019) with key `spyder_pc_alert`. No new actions needed, just ensure the event parses.

5. **Add these events to `spyder_bedroom.yaml`** (if not already present from earlier stories)

6. **Tests** — Verify stub actions register and execute without errors.

## Dependencies

- STORY-0018 (loads `spyder_bedroom.yaml`, fixes coordinate handling)
- STORY-0019 (`translated_dialog` action, needed by `Use Computer Kernel`)

## Acceptance Criteria

- [ ] `play_music` action executes without error (logs to console)
- [ ] `music_playing` condition evaluates without error
- [ ] Interacting with the computer at tile (3, 1) shows a placeholder dialog
- [ ] After `kernelquest:yes` is set, computer shows the `spyder_pc_alert` translated dialog instead
- [ ] No console errors from unrecognised actions/conditions when loading `spyder_bedroom.yaml`
- [ ] All checks pass (`npm run format:check && npm run lint && npx tsc --noEmit && npm test`)
