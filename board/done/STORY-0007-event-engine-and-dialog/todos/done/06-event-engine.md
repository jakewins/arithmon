# Task 6: Implement EventEngine

Implemented `src/game/event/engine.ts`:
- Holds EventDef[] and RunningEvent[]
- Each frame: check conditions, start new events, step running ones
- Tracks running event IDs to prevent duplicate starts
- `blocking` property aggregates from running events
