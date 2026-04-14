# Task 5: Implement RunningEvent

Implemented `src/game/event/running.ts`:
- Sequential action queue with current index
- Single-frame actions complete and advance immediately (same frame)
- Multi-frame actions yield until next frame
- `blocking` property for UI to check if player should be locked
