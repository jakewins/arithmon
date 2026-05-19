# Todo: Status handler and three baseline statuses

## What

1. Create `src/game/combat/statusHandler.ts`: `applyStatus`, `tickStatuses`, `clearStatus`, `gatesAction`.
2. Create `src/game/data/statuses.ts`: definitions for `poisoned`, `burn`, `sleep`. See upstream `mods/tuxemon/db/status/<slug>.yaml` for reference duration and effects.
3. Update `Monster.status` field to hold structured `StatusInstance[]` (or Map) instead of `string[]`.
4. Hook ticking into the combat turn loop (`machine.ts`): tick all statuses at end of round; check `gatesAction` before each turn.

## Sleep specifics

Sleep is the most interesting because it must short-circuit the actor's action. Make sure the combat machine's action selection flow returns a "skipped" log event rather than just no-op, so the UI shows "X is fast asleep!".
