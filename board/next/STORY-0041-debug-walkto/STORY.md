# STORY-0041: Debug walkTo Command

## Description

Add a `walkTo(tileX, tileY)` command to the debug bridge that moves the player to a target tile using A* pathfinding. This is the primary way an agent navigates the game world — instead of simulating arrow key sequences, the agent says "go to tile (5, 3)" and the player walks there automatically.

**Depends on:** STORY-0009 (A* pathfinding) and STORY-0038 (debug API foundation).

### API

```ts
// Walk the player to the target tile, resolves on arrival
await A.walkTo(5, 3)

// Walk and face a specific direction on arrival
await A.walkTo(5, 3, "up")
```

### Design

Reuse the pathfinding infrastructure from STORY-0009 (which provides `findPath()` and the walkability grid). The `walkTo` command:

1. Calls `findPath(playerTile, targetTile, grid)` to get a waypoint list
2. Moves the player tile-by-tile along the waypoints, using the same velocity/animation system as normal player movement (80 px/sec, walk animations)
3. At each waypoint: set player velocity toward the next tile, wait until the player reaches it, stop, advance to next waypoint
4. On arrival: stop player, optionally set facing direction, resolve the promise
5. If no path found: reject the promise with an error

While `walkTo` is active, normal keyboard input for movement should be suppressed (or the command should be cancelled if the player presses a key — either approach works, but suppressing is simpler).

### Movement approach

Rather than reimplementing movement, `walkTo` can drive the player by setting the same velocity and animation state that the keyboard input handler uses, just computed from the path instead of from key presses. Each frame during `walkTo`:

- Compute direction to next waypoint
- Set player velocity in that direction (same speed as normal movement)
- When player reaches the waypoint tile center, advance to next waypoint
- When all waypoints are consumed, stop and resolve

This means the movement looks identical to a player walking — same speed, same animations, same collision behavior.

### Integration with event engine

If the player steps on a grass tile during `walkTo` and triggers an encounter, or an event fires, the `walkTo` should pause (the event engine's `blocking` flag will naturally stop movement). After the encounter/event resolves, `walkTo` resumes. This matches how a real player would experience it.

### Tasks

1. Implement `walkTo(tileX, tileY, facing?)` on DebugBridge
2. Path computation using STORY-0009's `findPath()`
3. Tile-by-tile player movement along waypoints
4. Suppress keyboard movement while walkTo is active
5. Handle encounters/events interrupting the walk (pause and resume)
6. Handle no-path-found (reject promise)
7. Add tests for walkTo path following and edge cases

## Acceptance Criteria

- [ ] `A.walkTo(x, y)` moves the player to the target tile with proper walk animations
- [ ] Player navigates around obstacles via A* pathfinding
- [ ] Promise resolves when the player arrives
- [ ] Promise rejects if no path exists
- [ ] Encounters and events during the walk are handled naturally
- [ ] Optional facing direction is applied on arrival
- [ ] All code passes formatter, linter, typecheck, and tests
